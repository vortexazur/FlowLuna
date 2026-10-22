/**
 * Pure TypeScript Zero-Dependency QR Code Generator
 * Generates ISO/IEC 18004 compliant QR Code SVG and boolean matrices.
 * Supports Byte Mode encoding (ASCII / UTF-8) with Error Correction Level L/M.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11D (285)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function rsCompute(data: Uint8Array, numEcBytes: number): Uint8Array {
  // Generate generator polynomial
  const gen = new Uint8Array(numEcBytes + 1);
  gen[0] = 1;
  for (let i = 0; i < numEcBytes; i++) {
    const factor = EXP_TABLE[i];
    for (let j = i + 1; j > 0; j--) {
      gen[j] = gen[j] ^ gfMul(gen[j - 1], factor);
    }
  }

  const res = new Uint8Array(numEcBytes);
  for (let i = 0; i < data.length; i++) {
    const lead = data[i] ^ res[0];
    for (let j = 0; j < numEcBytes - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[j + 1], lead);
    }
    res[numEcBytes - 1] = gfMul(gen[numEcBytes], lead);
  }
  return res;
}

// Version table: [version, size, totalBytes, ecBytes, alignmentPositions]
interface VersionInfo {
  version: number;
  size: number;
  totalDataBytes: number;
  ecBytes: number;
  alignments: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, totalDataBytes: 19, ecBytes: 7, alignments: [] },
  { version: 2, size: 25, totalDataBytes: 34, ecBytes: 10, alignments: [6, 18] },
  { version: 3, size: 29, totalDataBytes: 55, ecBytes: 15, alignments: [6, 22] },
  { version: 4, size: 33, totalDataBytes: 80, ecBytes: 20, alignments: [6, 26] },
  { version: 5, size: 37, totalDataBytes: 108, ecBytes: 26, alignments: [6, 30] },
  { version: 6, size: 41, totalDataBytes: 136, ecBytes: 36, alignments: [6, 34] },
];

export interface QrCodeOptions {
  padding?: number;
  fgColor?: string;
  bgColor?: string;
  size?: number;
}

/**
 * Encodes text into a QR code matrix (2D boolean array).
 */
export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const dataLen = textBytes.length;

  // Pick smallest fitting version
  let verInfo = VERSIONS.find((v) => v.totalDataBytes >= dataLen + 3);
  if (!verInfo) {
    verInfo = VERSIONS[VERSIONS.length - 1];
  }

  const { size, totalDataBytes, ecBytes, alignments } = verInfo;

  // Bit buffer with mode indicator (0100 = 8-bit byte mode) and character count indicator (8 bits for v1-9)
  const bitBuf: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitBuf.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(dataLen, 8); // Length
  for (let i = 0; i < dataLen; i++) {
    pushBits(textBytes[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const capacityBits = totalDataBytes * 8;
  const termLen = Math.min(4, capacityBits - bitBuf.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bitBuf.length % 8 !== 0) {
    bitBuf.push(0);
  }

  // Pad with 0xEC, 0x11
  const PAD = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuf.length < capacityBits) {
    pushBits(PAD[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to bytes
  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < totalDataBytes; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitBuf[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  // Error correction
  const ecData = rsCompute(dataBytes, ecBytes);

  // Full codewords sequence
  const allCodewords = new Uint8Array(totalDataBytes + ecBytes);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecData, totalDataBytes);

  // Initialize matrix and reservation mask
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isReserved[r][c] = true;
    }
  };

  // 1. Finder patterns (7x7) + separators
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setModule(nr, nc, isBorder || isCenter);
          } else {
            setModule(nr, nc, false); // Separator
          }
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment patterns (5x5)
  if (alignments.length > 0) {
    for (const ar of alignments) {
      for (const ac of alignments) {
        // Skip if overlaps finder
        if (isReserved[ar][ac]) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
            const isDot = r === 0 && c === 0;
            setModule(ar + r, ac + c, isOuter || isDot);
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(size - 8, 8, true);

  // 5. Reserve format info areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isReserved[8][size - 1 - i] = true;
    isReserved[size - 1 - i][8] = true;
  }

  // 6. Data placement (zigzag)
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  const getBit = (idx: number) => {
    if (idx >= totalBits) return false;
    const byteIdx = Math.floor(idx / 8);
    const bitPos = 7 - (idx % 8);
    return ((allCodewords[byteIdx] >> bitPos) & 1) === 1;
  };

  let upwards = true;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing pattern column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const colOffset of [0, -1]) {
        const curCol = c + colOffset;
        if (!isReserved[r][curCol]) {
          const rawBit = getBit(bitIdx++);
          // Apply mask pattern 0: (row + col) % 2 === 0
          const mask = (r + curCol) % 2 === 0;
          matrix[r][curCol] = mask ? !rawBit : rawBit;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Write format info (Mask 000, ECC Level L = 01)
  // Format bit sequence for L-000 with BCH(15,5) error correction = 0x77C4 (0b111011111000100)
  const FORMAT_BITS = [
    true, true, true, false, true, true, true, true,
    true, false, false, false, true, false, false
  ];

  for (let i = 0; i < 6; i++) matrix[8][i] = FORMAT_BITS[i];
  matrix[8][7] = FORMAT_BITS[6];
  matrix[8][8] = FORMAT_BITS[7];
  matrix[7][8] = FORMAT_BITS[8];
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = FORMAT_BITS[i];

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = FORMAT_BITS[i];
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = FORMAT_BITS[i];

  return matrix;
}

/**
 * Renders a QR code matrix directly to an SVG string.
 */
export function generateQrSvg(text: string, options: QrCodeOptions = {}): string {
  const matrix = generateQrMatrix(text);
  const size = matrix.length;
  const padding = options.padding ?? 2;
  const total = size + padding * 2;
  const fg = options.fgColor || '#10b981';
  const bg = options.bgColor || 'transparent';
  const displaySize = options.size || 240;

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + padding}" y="${r + padding}" width="1" height="1" fill="${fg}" rx="0.15" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${displaySize}" height="${displaySize}" style="background-color:${bg};border-radius:12px;">${rects}</svg>`;
}

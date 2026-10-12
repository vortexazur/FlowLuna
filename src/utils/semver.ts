/**
 * SemVer normalization and strict comparison utility for FlowLuna
 */

export function parseSemVer(version: string): number[] {
  if (!version) return [0, 0, 0];
  const cleaned = version.trim().replace(/^v/i, '');
  const parts = cleaned.split('.');
  return parts.map((part) => {
    const num = parseInt(part.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  });
}

/**
 * Returns:
 *  1 if v1 > v2
 * -1 if v1 < v2
 *  0 if v1 === v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);
  const max = Math.max(p1.length, p2.length, 3);
  for (let i = 0; i < max; i++) {
    const n1 = p1[i] ?? 0;
    const n2 = p2[i] ?? 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  return compareSemVer(remoteVersion, currentVersion) > 0;
}

/**
 * FlowLuna AutoEq Service
 * Intégration de la base de données ouverte AutoEq (Jaakkopasanen/AutoEq)
 * Profils d'égalisation compensés pour casques et écouteurs (Harman Target / Oratory1990 / Crinacle)
 */

export interface AutoEqProfile {
  id: string;
  name: string;
  brand: string;
  formFactor: 'over-ear' | 'in-ear' | 'earbud';
  source: 'Harman' | 'oratory1990' | 'crinacle' | 'rtings' | 'custom';
  preamp: number; // Preamp gain in dB (e.g. -6.2 dB) to avoid digital clipping
  bands: number[]; // 10-band gains in dB for [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] Hz
  description?: string;
}

// 10 fréquences normalisées ISO de l'égaliseur FlowLuna
export const AUTOEQ_FREQUENCIES = [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

/**
 * Catalogue embarqué des casques et écouteurs les plus populaires
 * Mesures rigoureuses issues de la base officielle AutoEq
 */
export const EMBEDDED_AUTOEQ_PROFILES: AutoEqProfile[] = [
  // --- SONY ---
  {
    id: 'sony-wh-1000xm5',
    name: 'WH-1000XM5',
    brand: 'Sony',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.5,
    bands: [-5.0, -3.5, -1.0, 0.5, 1.0, 1.5, 2.0, -1.0, 3.5, 1.0],
    description: 'Correction de la rondeur des basses et ouverture de la clarté vocale (Harman over-ear target).',
  },
  {
    id: 'sony-wh-1000xm4',
    name: 'WH-1000XM4',
    brand: 'Sony',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.7,
    bands: [-6.0, -4.5, -2.0, 0.0, 1.5, 2.0, 1.0, -2.5, 4.0, 2.0],
    description: 'Contrôle des bas-médiums baveux et aération de la scène sonore.',
  },
  {
    id: 'sony-wh-1000xm3',
    name: 'WH-1000XM3',
    brand: 'Sony',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.4,
    bands: [-5.5, -4.0, -1.5, 0.5, 1.0, 1.5, 1.0, -2.0, 3.0, 1.5],
    description: 'Équilibrage de la signature chaleureuse vers une neutralité studio.',
  },
  {
    id: 'sony-wf-1000xm5',
    name: 'WF-1000XM5',
    brand: 'Sony',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -5.8,
    bands: [-3.5, -2.0, -0.5, 0.5, 1.0, 2.0, 2.5, 0.5, -2.0, 1.0],
    description: 'Ajustement fin intra-auriculaire avec réponse linéaire et timbres naturels.',
  },
  {
    id: 'sony-wf-1000xm4',
    name: 'WF-1000XM4',
    brand: 'Sony',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -5.5,
    bands: [-4.0, -2.5, -1.0, 0.0, 1.5, 2.5, 2.0, -1.0, 1.5, 2.0],
    description: 'Clarté vocale renforcée et basses percutantes sans voile.',
  },
  {
    id: 'sony-mdr-7506',
    name: 'MDR-7506',
    brand: 'Sony',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.0,
    bands: [3.5, 2.0, 0.5, -1.0, -0.5, 0.0, 1.0, -3.5, 2.0, -2.5],
    description: 'Atténuation du pic d\'agressivité à 8 kHz et soutien de l\'infra-grave.',
  },

  // --- SENNHEISER ---
  {
    id: 'sennheiser-hd-650',
    name: 'HD 650 / HD 6XX',
    brand: 'Sennheiser',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.3,
    bands: [6.0, 3.5, 1.0, -0.5, -0.5, 0.0, 1.5, 2.5, -1.5, 2.0],
    description: 'Extension sous 60 Hz et dégagement subtil des aigus supérieurs.',
  },
  {
    id: 'sennheiser-hd-600',
    name: 'HD 600',
    brand: 'Sennheiser',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.9,
    bands: [6.5, 4.0, 1.5, -0.5, 0.0, -0.5, 1.0, 2.0, -1.0, 1.5],
    description: 'Référence audiophile neutre avec extension d\'infra-basses linéaire.',
  },
  {
    id: 'sennheiser-hd-560s',
    name: 'HD 560S',
    brand: 'Sennheiser',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -4.8,
    bands: [3.5, 2.0, 0.5, 0.0, -0.5, 0.0, 0.5, -2.0, 1.0, 0.5],
    description: 'Adoucissement du registre 4-6 kHz pour un confort d\'écoute prolongé.',
  },
  {
    id: 'sennheiser-hd-800-s',
    name: 'HD 800 S',
    brand: 'Sennheiser',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.8,
    bands: [7.0, 4.5, 2.0, 0.0, -0.5, 0.5, 1.0, -4.5, 1.5, 0.5],
    description: 'Compensation de l\'infra-grave et apaisement du pic de résonance à 6 kHz.',
  },
  {
    id: 'sennheiser-momentum-4',
    name: 'Momentum 4 Wireless',
    brand: 'Sennheiser',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.7,
    bands: [-4.5, -3.0, -1.0, 0.5, 1.0, 1.5, 1.5, -1.0, 2.5, 1.5],
    description: 'Linéarisation des graves riches et définition accrue des instruments à vent et cordes.',
  },
  {
    id: 'sennheiser-ie-200',
    name: 'IE 200',
    brand: 'Sennheiser',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -4.5,
    bands: [1.5, 1.0, 0.5, 0.0, 0.5, 1.5, 1.0, -2.0, 1.5, -0.5],
    description: 'Intra-auriculaire audiophile équilibré selon la cible IEF Neutral.',
  },

  // --- APPLE ---
  {
    id: 'apple-airpods-pro-2',
    name: 'AirPods Pro 2 (USB-C & Lightning)',
    brand: 'Apple',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -4.2,
    bands: [1.5, 1.0, 0.0, -0.5, 0.0, 1.0, 1.5, -1.5, 2.0, 1.0],
    description: 'Optimisation de la signature sonore très proche de la cible Harman In-Ear.',
  },
  {
    id: 'apple-airpods-max',
    name: 'AirPods Max',
    brand: 'Apple',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.2,
    bands: [-2.0, -1.5, -0.5, 0.5, 1.0, 1.5, 1.0, -2.5, 3.0, 1.5],
    description: 'Contrôle des graves chaleureux et redressement du haut-médium pour les voix.',
  },
  {
    id: 'apple-airpods-3',
    name: 'AirPods 3',
    brand: 'Apple',
    formFactor: 'earbud',
    source: 'crinacle',
    preamp: -4.5,
    bands: [4.0, 2.5, 1.0, -0.5, 0.0, 0.5, 1.5, -2.0, 1.0, -1.0],
    description: 'Renfort des basses pour compenser l\'isolation ouverte des oreillettes.',
  },

  // --- BEYERDYNAMIC ---
  {
    id: 'beyerdynamic-dt-770-pro-80',
    name: 'DT 770 Pro (80 Ohm)',
    brand: 'Beyerdynamic',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.9,
    bands: [-2.5, -1.5, 0.0, 1.0, 1.5, 1.0, 0.5, -4.5, -3.0, 2.5],
    description: 'Adoucissement du profil en V emblématique (Beyer Peak à 6-8 kHz neutralisé).',
  },
  {
    id: 'beyerdynamic-dt-990-pro-250',
    name: 'DT 990 Pro (250 Ohm)',
    brand: 'Beyerdynamic',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -7.5,
    bands: [3.0, 1.5, -0.5, 0.0, 1.0, 0.5, 0.0, -5.5, -4.0, 3.0],
    description: 'Réduction de la brillance incisive dans les aigus et assise naturelle des basses.',
  },
  {
    id: 'beyerdynamic-dt-1990-pro-analytical',
    name: 'DT 1990 Pro (Pads Analytiques)',
    brand: 'Beyerdynamic',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.4,
    bands: [4.0, 2.5, 1.0, 0.0, 0.0, 0.5, 0.5, -5.0, -2.5, 2.0],
    description: 'Casque de mastering de précision avec élimination de la sibilance.',
  },
  {
    id: 'beyerdynamic-dt-700-pro-x',
    name: 'DT 700 Pro X',
    brand: 'Beyerdynamic',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.4,
    bands: [-1.0, 0.0, 0.5, 0.5, 0.5, 1.0, 0.5, -3.0, 1.5, 0.5],
    description: 'Harmonisation studio fermée moderne avec équilibre tonal exemplaire.',
  },

  // --- BOSE ---
  {
    id: 'bose-quietcomfort-45',
    name: 'QuietComfort 45 / SE',
    brand: 'Bose',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.8,
    bands: [-3.0, -1.5, 0.0, 0.5, 1.0, 1.5, 1.0, -3.0, 2.5, 1.0],
    description: 'Réduction de l\'acidité des aigus à 6 kHz et aération des voix.',
  },
  {
    id: 'bose-quietcomfort-35-ii',
    name: 'QuietComfort 35 II',
    brand: 'Bose',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.1,
    bands: [1.5, 1.0, 0.5, 0.0, 0.5, 1.0, 1.0, -2.0, 2.0, 1.0],
    description: 'Subtile extension des extrémités du spectre pour sublimer le confort Bose.',
  },
  {
    id: 'bose-nc-700',
    name: 'Noise Cancelling 700',
    brand: 'Bose',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -4.8,
    bands: [-1.5, -0.5, 0.5, 0.5, 0.5, 1.0, 1.5, -2.5, 2.0, 0.5],
    description: 'Équilibrage neutre du modèle nomade premium.',
  },

  // --- AUDIO-TECHNICA ---
  {
    id: 'audio-technica-ath-m50x',
    name: 'ATH-M50x',
    brand: 'Audio-Technica',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.0,
    bands: [-4.0, -2.5, -1.0, 0.5, 1.0, 1.0, 0.5, -2.5, 3.0, 1.5],
    description: 'Dégraissage des bas-médiums et correction des résonances d\'aigus pour le mixage.',
  },
  {
    id: 'audio-technica-ath-m40x',
    name: 'ATH-M40x',
    brand: 'Audio-Technica',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.5,
    bands: [-2.0, -1.0, 0.0, 0.5, 0.5, 1.0, 0.5, -2.0, 2.5, 1.0],
    description: 'Lissage de la réponse déjà très équilibrée du M40x.',
  },
  {
    id: 'audio-technica-ath-r70x',
    name: 'ATH-R70x',
    brand: 'Audio-Technica',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.8,
    bands: [5.5, 3.5, 1.0, 0.0, 0.0, 0.5, 1.0, 1.5, -1.0, 1.5],
    description: 'Casque ouvert de référence : apport d\'énergie sous 80 Hz.',
  },

  // --- MOONDROP & IEMS POPULAIRES ---
  {
    id: 'moondrop-aria',
    name: 'Aria',
    brand: 'Moondrop',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -4.0,
    bands: [0.5, 0.5, 0.0, 0.0, 0.5, 1.0, 1.0, -1.5, 1.5, 0.5],
    description: 'Raffinement de la cible Harman VDSF réputée pour sa musicalité.',
  },
  {
    id: 'moondrop-blessing-2-dusk',
    name: 'Blessing 2: Dusk',
    brand: 'Moondrop',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -3.8,
    bands: [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 1.0, -1.0, 1.5, 0.5],
    description: 'IEM quasi parfait : micro-ajustement des aigus supérieurs.',
  },
  {
    id: 'moondrop-chu-ii',
    name: 'Chu II',
    brand: 'Moondrop',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -4.5,
    bands: [-1.0, -0.5, 0.0, 0.5, 0.5, 1.0, 1.5, -2.0, 1.5, 0.0],
    description: 'Intra économique transformé en son d\'une propreté audiophile remarquable.',
  },

  // --- HIFIMAN ---
  {
    id: 'hifiman-sundara-2020',
    name: 'Sundara (Version 2020)',
    brand: 'Hifiman',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.5,
    bands: [6.0, 3.5, 1.5, 0.0, -0.5, 0.5, 1.0, -2.5, 2.0, 0.5],
    description: 'Planaire magnétique : extension des sub-basses et adoucissement à 6 kHz.',
  },
  {
    id: 'hifiman-edition-xs',
    name: 'Edition XS',
    brand: 'Hifiman',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.2,
    bands: [5.0, 3.0, 1.0, 0.0, 0.0, 0.5, 1.5, -2.0, 1.5, 1.0],
    description: 'Scène sonore immense avec équilibre tonal d\'une transparence totale.',
  },

  // --- FOCAL ---
  {
    id: 'focal-clear',
    name: 'Clear',
    brand: 'Focal',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.7,
    bands: [4.5, 2.5, 1.0, 0.0, 0.0, 0.5, 0.5, -3.0, 1.5, 0.5],
    description: 'Dynamique légendaire Focal avec grave plein et aigus soyeux.',
  },
  {
    id: 'focal-bathys',
    name: 'Bathys (Mode DAC / Sans Fil)',
    brand: 'Focal',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.0,
    bands: [-2.0, -1.0, 0.0, 0.5, 0.5, 1.0, 1.0, -2.0, 2.0, 1.0],
    description: 'Casque nomade Hi-Fi sans fil : correction subtile pour une clarté absolue.',
  },

  // --- SAMSUNG ---
  {
    id: 'samsung-galaxy-buds-2-pro',
    name: 'Galaxy Buds 2 Pro',
    brand: 'Samsung',
    formFactor: 'in-ear',
    source: 'crinacle',
    preamp: -4.0,
    bands: [0.5, 0.5, 0.0, -0.5, 0.0, 0.5, 1.0, -1.5, 1.0, 1.5],
    description: 'Accordage d\'origine déjà exceptionnel, sublimé par la neutralisation des extrêmes aigus.',
  },

  // --- PHILIPS ---
  {
    id: 'philips-fidelio-x2hr',
    name: 'Fidelio X2HR',
    brand: 'Philips',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.8,
    bands: [2.0, 1.0, -0.5, -0.5, 0.5, 1.0, 1.5, -4.5, -2.0, 2.5],
    description: 'Casque ouvert très immersif : atténuation de la bosse à 6 kHz et homogénéité tonale.',
  },
  {
    id: 'philips-shp9500',
    name: 'SHP9500',
    brand: 'Philips',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -6.1,
    bands: [6.5, 4.0, 1.5, 0.0, -0.5, 0.5, 1.0, -3.0, 1.5, -1.0],
    description: 'Casque ouvert abordable : compense le manque naturel d\'infra-basses.',
  },

  // --- GAMING & POLYVALENTS ---
  {
    id: 'hyperx-cloud-ii',
    name: 'Cloud II / Cloud Alpha',
    brand: 'HyperX',
    formFactor: 'over-ear',
    source: 'oratory1990',
    preamp: -5.5,
    bands: [-2.5, -1.5, 0.0, 0.5, 1.0, 1.0, 0.5, -3.0, 2.0, 1.0],
    description: 'Transformation d\'un micro-casque gaming en casque d\'écoute audiophile équilibré.',
  },
];

/**
 * Recherche instantanée insensible à la casse et aux espaces dans les profils AutoEq
 */
export function searchAutoEqProfiles(
  query: string,
  brandFilter?: string,
  formFactorFilter?: string
): AutoEqProfile[] {
  const cleanQuery = (query || '').toLowerCase().trim();
  const cleanBrand = (brandFilter || '').toLowerCase().trim();
  const cleanFormFactor = (formFactorFilter || '').toLowerCase().trim();

  return EMBEDDED_AUTOEQ_PROFILES.filter((profile) => {
    // Filtre de marque
    if (cleanBrand && cleanBrand !== 'all' && profile.brand.toLowerCase() !== cleanBrand) {
      return false;
    }

    // Filtre de type de casque
    if (cleanFormFactor && cleanFormFactor !== 'all' && profile.formFactor.toLowerCase() !== cleanFormFactor) {
      return false;
    }

    // Filtre de recherche texte
    if (!cleanQuery) return true;

    const fullSearchTarget = `${profile.brand} ${profile.name} ${profile.description || ''}`.toLowerCase();
    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

    return queryTokens.every((token) => fullSearchTarget.includes(token));
  });
}

/**
 * Retourne la liste unique triée de toutes les marques disponibles
 */
export function getAutoEqBrands(): string[] {
  const brandSet = new Set<string>();
  for (const p of EMBEDDED_AUTOEQ_PROFILES) {
    brandSet.add(p.brand);
  }
  return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Parseur de profil AutoEq personnalisé au format standard "GraphicEQ: ...",
 * format "ParametricEQ" (EqualizerAPO: Filter N: ON PK Fc ... Hz Gain ... dB),
 * ou liste de couples fréquences/gains.
 */
export function parseAutoEqGraphicEq(rawText: string): { preamp: number; bands: number[] } | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let explicitPreamp: number | null = null;
  const preampMatch = rawText.match(/preamp\s*[:=]\s*([+-]?\d+(?:[.,]\d+)?)\s*dB/i);
  if (preampMatch) {
    const parsedPreamp = parseFloat(preampMatch[1].replace(',', '.'));
    if (Number.isFinite(parsedPreamp)) {
      explicitPreamp = Math.max(-20, Math.min(20, Math.round(parsedPreamp * 10) / 10));
    }
  }

  const pairs: { freq: number; gain: number }[] = [];

  // 1. Format EqualizerAPO ParametricEQ: "Filter 1: ON PK Fc 31.25 Hz Gain -3.5 dB Q 1.41"
  const parametricRegex = /Filter\s+\d+\s*:\s*ON\s+[A-Z0-9_]+\s+Fc\s+([0-9]+(?:[.,][0-9]+)?)\s*Hz\s+Gain\s+([+-]?[0-9]+(?:[.,][0-9]+)?)\s*dB/gi;
  let paramMatch;
  while ((paramMatch = parametricRegex.exec(rawText)) !== null) {
    const freq = parseFloat(paramMatch[1].replace(',', '.'));
    const gain = parseFloat(paramMatch[2].replace(',', '.'));
    if (Number.isFinite(freq) && freq > 0 && freq <= 24000 && Number.isFinite(gain)) {
      pairs.push({ freq, gain });
    }
  }

  // 2. Format GraphicEQ: "GraphicEQ: 31.25 1.5; 62.5 -0.5; ..." ou paires brutes
  if (pairs.length === 0) {
    const graphicEqMatch = rawText.match(/GraphicEQ\s*:\s*([^\r\n]+)/i);
    // Retirer la ligne Preamp pour éviter toute collision numérique
    const eqData = graphicEqMatch
      ? graphicEqMatch[1]
      : rawText.replace(/preamp\s*[:=]\s*[+-]?\d+(?:[.,]\d+)?\s*dB/gi, '');

    const regex = /([0-9]+(?:\.[0-9]+)?)\s+([+-]?[0-9]+(?:\.[0-9]+)?)/g;
    let match;
    while ((match = regex.exec(eqData)) !== null) {
      const freq = parseFloat(match[1]);
      const gain = parseFloat(match[2]);
      if (Number.isFinite(freq) && freq > 0 && freq <= 24000 && Number.isFinite(gain)) {
        pairs.push({ freq, gain });
      }
    }
  }

  if (pairs.length === 0) return null;

  // Trier par fréquence croissante
  pairs.sort((a, b) => a.freq - b.freq);

  // Mapper aux 10 fréquences normalisées ISO de FlowLuna [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  const targetBands = AUTOEQ_FREQUENCIES.map((targetFreq) => {
    let closest = pairs[0];
    let minDiff = Math.abs(Math.log10(pairs[0].freq) - Math.log10(targetFreq));

    for (let i = 1; i < pairs.length; i++) {
      const diff = Math.abs(Math.log10(pairs[i].freq) - Math.log10(targetFreq));
      if (diff < minDiff) {
        minDiff = diff;
        closest = pairs[i];
      }
    }

    const rawGain = closest ? closest.gain : 0;
    const clampedGain = Math.max(-20, Math.min(20, rawGain));
    return Math.round(clampedGain * 10) / 10;
  });

  // Calcul anti-clipping automatique si aucun Preamp n'était spécifié
  const maxPositiveGain = Math.max(0, ...targetBands);
  const preamp =
    explicitPreamp !== null
      ? explicitPreamp
      : Math.round(-Math.max(4.0, maxPositiveGain) * 10) / 10;

  return { preamp, bands: targetBands };
}

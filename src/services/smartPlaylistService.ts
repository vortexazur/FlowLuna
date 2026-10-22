import { Track, Playlist, SmartPlaylistRule, SmartPlaylistConfig, SmartType } from '../types';

export interface SmartPlaylistPreset {
  id: SmartType;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  coverUrl: string;
  config: SmartPlaylistConfig;
}

export const SMART_PLAYLIST_PRESETS: SmartPlaylistPreset[] = [
  {
    id: 'most_played',
    title: 'Top 50 Écoutés',
    description: 'Les morceaux les plus souvent écoutés dans votre bibliothèque',
    icon: 'flame',
    iconColor: 'amber',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    config: {
      type: 'most_played',
      limit: 50,
      sortBy: 'playCount',
      sortOrder: 'desc',
    },
  },
  {
    id: 'recent',
    title: 'Ajouts Récents',
    description: 'Derniers morceaux et albums importés dans FlowLuna',
    icon: 'sparkles',
    iconColor: 'cyan',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    config: {
      type: 'recent',
      limit: 50,
      sortBy: 'addedAt',
      sortOrder: 'desc',
    },
  },
  {
    id: 'hires',
    title: 'Hi-Res Audio Studio',
    description: 'Fichiers audio haute résolution et sans perte (FLAC, WAV, 320kbps+)',
    icon: 'disc',
    iconColor: 'emerald',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    config: {
      type: 'hires',
      sortBy: 'title',
      sortOrder: 'asc',
    },
  },
  {
    id: 'forgotten',
    title: 'Pépites Oubliées',
    description: 'Morceaux de votre collection encore jamais ou rarement écoutés',
    icon: 'compass',
    iconColor: 'violet',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80',
    config: {
      type: 'forgotten',
      limit: 50,
      sortBy: 'addedAt',
      sortOrder: 'asc',
    },
  },
  {
    id: 'video_collection',
    title: 'Collection Vidéos & Concerts',
    description: 'Toutes les vidéos, génériques d’animes et clips musicaux locaux',
    icon: 'film',
    iconColor: 'rose',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    config: {
      type: 'video_collection',
      sortBy: 'title',
      sortOrder: 'asc',
    },
  },
];

/**
 * Évalue une règle de playlist intelligente sur un morceau donné.
 */
export function evaluateRule(track: Track, rule: SmartPlaylistRule): boolean {
  let trackVal: any;

  switch (rule.field) {
    case 'title':
      trackVal = track.title || '';
      break;
    case 'artist':
      trackVal = track.artist || '';
      break;
    case 'album':
      trackVal = track.album || '';
      break;
    case 'genre':
      trackVal = track.genre || '';
      break;
    case 'format':
      trackVal = track.format || '';
      break;
    case 'playCount':
      trackVal = track.playCount || 0;
      break;
    case 'addedAt':
      trackVal = track.addedAt || 0;
      break;
    case 'duration':
      trackVal = track.duration || 0;
      break;
    case 'isFavorite':
      trackVal = !!track.isFavorite;
      break;
    case 'isVideo':
      trackVal = !!track.isVideo;
      break;
    default:
      return true;
  }

  const strTrackVal = String(trackVal).toLowerCase().trim();
  const strRuleVal = String(rule.value ?? '').toLowerCase().trim();
  const numTrackVal = Number(trackVal) || 0;
  const numRuleVal = Number(rule.value) || 0;

  switch (rule.operator) {
    case 'equals':
      if (typeof trackVal === 'boolean') return trackVal === Boolean(rule.value);
      if (typeof trackVal === 'number') return numTrackVal === numRuleVal;
      return strTrackVal === strRuleVal;

    case 'notEquals':
      if (typeof trackVal === 'boolean') return trackVal !== Boolean(rule.value);
      if (typeof trackVal === 'number') return numTrackVal !== numRuleVal;
      return strTrackVal !== strRuleVal;

    case 'contains':
      return strTrackVal.includes(strRuleVal);

    case 'notContains':
      return !strTrackVal.includes(strRuleVal);

    case 'startsWith':
      return strTrackVal.startsWith(strRuleVal);

    case 'greaterThan':
      return numTrackVal > numRuleVal;

    case 'lessThan':
      return numTrackVal < numRuleVal;

    case 'isTrue':
      return !!trackVal;

    case 'isFalse':
      return !trackVal;

    default:
      return true;
  }
}

/**
 * Calcule dynamiquement en temps réel la liste des morceaux correspondant à une playlist intelligente.
 */
export function computeSmartPlaylistTracks(playlist: Playlist, allTracks: Track[]): Track[] {
  if (!playlist.isSmart) {
    return playlist.trackIds
      .map((tid) => allTracks.find((t) => t.id === tid))
      .filter((t): t is Track => !!t);
  }

  const smartType = playlist.smartType || playlist.smartConfig?.type;
  const config = playlist.smartConfig;

  let result: Track[] = [];

  switch (smartType) {
    case 'favorites':
      result = allTracks.filter((t) => t.isFavorite);
      break;

    case 'offline':
      result = allTracks.filter((t) => t.isCachedOffline);
      break;

    case 'youtube':
      result = allTracks.filter((t) => t.source === 'youtube');
      break;

    case 'most_played':
      result = allTracks
        .filter((t) => (t.playCount || 0) > 0)
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      if (config?.limit) result = result.slice(0, config.limit);
      else if (!config) result = result.slice(0, 50);
      return result;

    case 'recent': {
      // 30 derniers jours ou tri chronologique décroissant
      result = allTracks.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      if (config?.limit) result = result.slice(0, config.limit);
      else if (!config) result = result.slice(0, 50);
      return result;
    }

    case 'hires': {
      const LOSSLESS = ['flac', 'wav', 'alac', 'aiff'];
      result = allTracks.filter((t) => {
        const fmt = (t.format || '').toLowerCase();
        const isLossless = LOSSLESS.includes(fmt);
        const isHighBitrate = typeof t.bitrate === 'number' && t.bitrate >= 320;
        return isLossless || isHighBitrate;
      });
      break;
    }

    case 'forgotten': {
      result = allTracks
        .filter((t) => !t.playCount || t.playCount === 0)
        .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
      if (config?.limit) result = result.slice(0, config.limit);
      else if (!config) result = result.slice(0, 50);
      return result;
    }

    case 'video_collection':
      result = allTracks.filter((t) => !!t.isVideo);
      break;

    case 'custom':
    default:
      if (config?.rules && config.rules.length > 0) {
        const matchAll = config.matchType !== 'any';
        result = allTracks.filter((track) => {
          if (matchAll) {
            return config.rules!.every((rule) => evaluateRule(track, rule));
          } else {
            return config.rules!.some((rule) => evaluateRule(track, rule));
          }
        });
      } else {
        // Fallback générique
        result = [...allTracks];
      }
      break;
  }

  // Tri optionnel si configuré
  if (config?.sortBy) {
    const isAsc = config.sortOrder === 'asc';
    result = result.slice().sort((a, b) => {
      let va: any = a[config.sortBy as keyof Track] || 0;
      let vb: any = b[config.sortBy as keyof Track] || 0;
      if (typeof va === 'string') {
        return isAsc ? va.localeCompare(String(vb)) : String(vb).localeCompare(va);
      }
      return isAsc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
  }

  if (config?.limit && config.limit > 0) {
    result = result.slice(0, config.limit);
  }

  return result;
}

/**
 * Crée une instance de playlist intelligente à partir d'un preset.
 */
export function buildSmartPlaylistFromPreset(
  presetId: SmartType,
  overrides?: Partial<Playlist>
): Playlist {
  const preset = SMART_PLAYLIST_PRESETS.find((p) => p.id === presetId) || SMART_PLAYLIST_PRESETS[0];

  return {
    id: `smart-${preset.id}-${Date.now()}`,
    title: overrides?.title || preset.title,
    description: overrides?.description || preset.description,
    coverUrl: overrides?.coverUrl || preset.coverUrl,
    icon: overrides?.icon || preset.icon,
    iconColor: overrides?.iconColor || preset.iconColor,
    trackIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isSmart: true,
    smartType: preset.id,
    smartConfig: preset.config,
    isPinned: overrides?.isPinned !== undefined ? overrides.isPinned : true,
    ...overrides,
  };
}

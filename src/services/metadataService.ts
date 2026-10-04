export interface TrackMetadataResult {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  coverUrl?: string;
}

/**
 * Searches online track metadata and high-resolution cover artwork.
 * Tries FlowLuna backend local caching endpoint first, falls back to direct iTunes Search API.
 */
export async function fetchOnlineMetadata(
  artist?: string,
  title?: string,
  query?: string
): Promise<TrackMetadataResult | null> {
  // 1. Try local FlowLuna server endpoint first (which caches the image to local storage)
  try {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (artist && artist !== 'Artiste Local') params.set('artist', artist);
    if (title) params.set('title', title);

    const res = await fetch(`/api/metadata/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.metadata) {
        return data.metadata;
      }
    }
  } catch {
    // Backend offline or running in standalone web mode
  }

  // 2. Direct browser fallback via Apple / iTunes Search API (CORS enabled)
  try {
    let searchTerm = query?.trim() || '';
    if (!searchTerm) {
      if (artist && artist !== 'Artiste Local' && title) {
        searchTerm = `${artist} ${title}`;
      } else if (title) {
        searchTerm = title;
      }
    }
    if (!searchTerm) return null;

    const cleanTerm = searchTerm
      .replace(/\b(?:ft\.|feat\.|featuring|official|video|music video|clip|audio|lyrics|paroles|remix|hd|4k)\b/gi, '')
      .trim();

    const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm || searchTerm)}&entity=song&limit=1`;
    const resp = await fetch(targetUrl);
    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;

    const item = data.results[0];
    const foundTitle = item.trackName || undefined;
    const foundArtist = item.artistName || undefined;
    const foundAlbum = item.collectionName || undefined;
    const foundGenre = item.primaryGenreName || undefined;
    let foundYear: string | undefined;
    if (item.releaseDate && typeof item.releaseDate === 'string' && item.releaseDate.length >= 4) {
      foundYear = item.releaseDate.substring(0, 4);
    }
    let coverUrl: string | undefined;
    if (item.artworkUrl100 && typeof item.artworkUrl100 === 'string') {
      coverUrl = item.artworkUrl100.replace('100x100bb', '600x600bb');
    }

    return {
      title: foundTitle,
      artist: foundArtist,
      album: foundAlbum,
      genre: foundGenre,
      year: foundYear,
      coverUrl,
    };
  } catch {
    return null;
  }
}

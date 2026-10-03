import { Track } from '../types';

class DiscordRpcService {
  private lastTrackId: string | null = null;
  private lastIsPlaying: boolean = false;
  private updateTimeout: number | null = null;

  public updatePresence(track: Track | null, isPlaying: boolean, currentTime: number = 0, enabled: boolean = true) {
    if (!enabled || !track) {
      this.clearPresence();
      return;
    }

    if (this.updateTimeout) {
      window.clearTimeout(this.updateTimeout);
    }

    // Debounce 250ms to prevent high-frequency IPC spam during rapid scrubbing
    this.updateTimeout = window.setTimeout(async () => {
      try {
        await fetch('/api/discord/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: track.title,
            artist: track.artist,
            album: track.album || 'FlowLuna',
            duration: track.duration || 0,
            position: Math.round(currentTime),
            isPlaying,
          }),
        });
        this.lastTrackId = track.id;
        this.lastIsPlaying = isPlaying;
      } catch (err) {
        // Silently ignore if server or Discord is unavailable
      }
    }, 250);
  }

  public async clearPresence() {
    if (this.updateTimeout) {
      window.clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    this.lastTrackId = null;
    this.lastIsPlaying = false;
    try {
      await fetch('/api/discord/clear', { method: 'POST' });
    } catch {
      // Ignore
    }
  }
}

export const discordRpc = new DiscordRpcService();

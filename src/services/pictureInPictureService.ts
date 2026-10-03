/**
 * Service to manage Detached Always-on-Top Picture-in-Picture (PiP) Window
 * Uses Document Picture-in-Picture API when available (Chrome 116+, Edge, etc.)
 * with automatic fallback to popup window or video PiP.
 */

export interface PipWindowResult {
  window: Window;
  type: 'document-pip' | 'popup';
}

/**
 * Copies all active stylesheets from the main document to the target window
 */
export function injectStylesToWindow(targetWindow: Window) {
  try {
    const doc = targetWindow.document;
    doc.title = 'PlayZic';

    // Copy external CSS links
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      try {
        const newLink = doc.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = (link as HTMLLinkElement).href;
        doc.head.appendChild(newLink);
      } catch (err) {
        console.warn('Could not copy link stylesheet to PiP window:', err);
      }
    });

    // Copy style tags (Tailwind CSS, animations, etc.)
    document.querySelectorAll('style').forEach((style) => {
      try {
        const newStyle = doc.createElement('style');
        newStyle.textContent = style.textContent;
        doc.head.appendChild(newStyle);
      } catch (err) {
        console.warn('Could not copy style to PiP window:', err);
      }
    });

    // Inject base reset and auto-scaling rules for PiP
    const pipCustomStyle = doc.createElement('style');
    pipCustomStyle.id = 'playzic-pip-responsive-styles';
    pipCustomStyle.textContent = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        background-color: #0d0e12 !important;
        color: #ffffff !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        box-sizing: border-box !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
      }
      .pip-root {
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        container-type: inline-size !important;
        background: #121316 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      .pip-container {
        width: 100% !important;
        height: 100% !important;
        padding: 3.5cqw 4.5cqw !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        color: #ffffff !important;
        user-select: none !important;
      }
      .pip-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        height: 10cqw !important;
      }
      .pip-label {
        font-size: 2.5cqw !important;
        font-weight: 800 !important;
        letter-spacing: 0.15cqw !important;
        color: #9ca3af !important;
        text-transform: uppercase !important;
      }
      .pip-visualizer {
        display: flex !important;
        align-items: center !important;
        gap: 0.5cqw !important;
        height: 6.5cqw !important;
        padding: 0.6cqw 2.5cqw !important;
        background: #1c1d22 !important;
        border-radius: 4cqw !important;
        border: 1px solid #2a2b32 !important;
      }
      .pip-bar {
        width: 0.7cqw !important;
        min-height: 15% !important;
        background: linear-gradient(to top, #d97706, #f59e0b) !important;
        border-radius: 1cqw !important;
        transition: height 0.15s ease !important;
      }
      .pip-bar-animated {
        animation: pip-bar-bounce 1.2s ease-in-out infinite alternate !important;
      }
      @keyframes pip-bar-bounce {
        0% { transform: scaleY(0.4); }
        100% { transform: scaleY(1.1); }
      }
      .pip-header-actions {
        display: flex !important;
        gap: 2cqw !important;
      }
      .pip-track-section {
        display: flex !important;
        align-items: center !important;
        gap: 3cqw !important;
        margin: 0.5cqw 0 !important;
      }
      .pip-cover {
        width: 15cqw !important;
        height: 15cqw !important;
        border-radius: 3.2cqw !important;
        object-fit: cover !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        flex-shrink: 0 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      .pip-meta {
        flex: 1 !important;
        min-width: 0 !important;
      }
      .pip-title {
        margin: 0 !important;
        font-size: 3.5cqw !important;
        font-weight: 700 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        color: #ffffff !important;
        line-height: 1.2 !important;
      }
      .pip-artist {
        margin: 0.4cqw 0 0 0 !important;
        font-size: 2.7cqw !important;
        color: #9ca3af !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .pip-track-actions {
        display: flex !important;
        align-items: center !important;
        gap: 1.5cqw !important;
      }
      .pip-progress-section {
        display: flex !important;
        align-items: center !important;
        gap: 2cqw !important;
      }
      .pip-time {
        font-size: 2.6cqw !important;
        color: #9ca3af !important;
        font-variant-numeric: tabular-nums !important;
        min-width: 5.5cqw !important;
      }
      .pip-slider-wrapper {
        flex: 1 !important;
        display: flex !important;
        align-items: center !important;
      }
      .pip-range-input {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 100% !important;
        height: 1.2cqw !important;
        border-radius: 1cqw !important;
        outline: none !important;
        cursor: pointer !important;
        background: #374151 !important;
      }
      .pip-range-input::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        appearance: none !important;
        width: 3.6cqw !important;
        height: 3.6cqw !important;
        border-radius: 50% !important;
        background: #ffffff !important;
        border: 0.5cqw solid #f59e0b !important;
        cursor: pointer !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35) !important;
        transition: transform 0.1s ease !important;
      }
      .pip-range-input::-webkit-slider-thumb:hover {
        transform: scale(1.15) !important;
      }
      .pip-range-input::-moz-range-thumb {
        width: 3.6cqw !important;
        height: 3.6cqw !important;
        border-radius: 50% !important;
        background: #ffffff !important;
        border: 0.5cqw solid #f59e0b !important;
        cursor: pointer !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35) !important;
      }
      .pip-controls-footer {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .pip-volume-box {
        display: flex !important;
        align-items: center !important;
        gap: 1.5cqw !important;
        width: 25cqw !important;
      }
      .pip-volume-range {
        background: #374151 !important;
      }
      .pip-main-controls {
        display: flex !important;
        align-items: center !important;
        gap: 2.5cqw !important;
      }
      .pip-icon-btn,
      .pip-btn-ctrl {
        background: transparent !important;
        border: none !important;
        color: #9ca3af !important;
        cursor: pointer !important;
        padding: 0.8cqw !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        transition: color 0.15s ease, transform 0.1s ease !important;
      }
      .pip-icon-btn:hover,
      .pip-btn-ctrl:hover {
        color: #ffffff !important;
        transform: scale(1.08) !important;
      }
      .pip-icon-btn.active-fav {
        color: #ef4444 !important;
      }
      .pip-btn-play {
        width: 9.5cqw !important;
        height: 9.5cqw !important;
        border-radius: 50% !important;
        background: #f59e0b !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        box-shadow: 0 0 12px rgba(245, 158, 11, 0.4) !important;
        transition: transform 0.1s ease, background 0.15s ease !important;
        color: #000000 !important;
      }
      .pip-btn-play:hover {
        background: #d97706 !important;
        transform: scale(1.06) !important;
      }
      .pip-btn-play:active {
        transform: scale(0.95) !important;
      }
      .pip-svg {
        width: 3.2cqw !important;
        height: 3.2cqw !important;
      }
      .pip-svg-sm {
        width: 3.5cqw !important;
        height: 3.5cqw !important;
      }
      .pip-svg-md {
        width: 4.2cqw !important;
        height: 4.2cqw !important;
      }
      .pip-svg-lg {
        width: 5cqw !important;
        height: 5cqw !important;
      }
      .pip-svg-play {
        width: 4.8cqw !important;
        height: 4.8cqw !important;
      }
      .ml-v {
        margin-left: 0.5cqw !important;
      }
      .text-gray {
        color: #9ca3af !important;
      }
    `;
    doc.head.appendChild(pipCustomStyle);

    // Dynamic resize handler for calculating custom scale ratios
    const updateDimensions = () => {
      try {
        const width = targetWindow.innerWidth;
        const height = targetWindow.innerHeight;
        targetWindow.document.documentElement.style.setProperty('--pip-width', `${width}px`);
        targetWindow.document.documentElement.style.setProperty('--pip-height', `${height}px`);
      } catch {}
    };

    targetWindow.addEventListener('resize', updateDimensions);
    updateDimensions();

    // Body container styling
    doc.body.style.margin = '0';
    doc.body.style.padding = '0';
    doc.body.style.backgroundColor = '#0d0f17';
    doc.body.style.color = '#f3f4f6';
    doc.body.style.overflow = 'hidden';
    doc.body.style.userSelect = 'none';
  } catch (err) {
    console.warn('Error injecting styles into detached window:', err);
  }
}

/**
 * Request an Always-on-Top Document Picture-in-Picture Window
 * Falls back to detached popup window if Document PiP is unavailable or blocked.
 */
export async function openAlwaysOnTopWindow(
  width = 360,
  height = 220
): Promise<PipWindowResult | null> {
  // 1. Try Document Picture-in-Picture API (Chrome, Edge, Brave, Chromium)
  if ('documentPictureInPicture' in window) {
    try {
      const pipWindow: Window = await (window as any).documentPictureInPicture.requestWindow({
        width,
        height,
        disallowReturnToOpener: true,
      });

      if (pipWindow) {
        pipWindow.document.title = 'PlayZic';
        injectStylesToWindow(pipWindow);
        return { window: pipWindow, type: 'document-pip' };
      }
    } catch (pipErr) {
      console.warn('Document Picture-in-Picture request failed or was not allowed in current context:', pipErr);
    }
  }

  // 2. Fallback: Compact Detached Popup Window
  try {
    const left = Math.max(0, window.screen.width - width - 50);
    const top = Math.max(0, window.screen.height - height - 100);
    const popup = window.open(
      '',
      'playzic_always_on_top',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );

    if (popup && !popup.closed) {
      popup.document.title = 'PlayZic';
      injectStylesToWindow(popup);
      return { window: popup, type: 'popup' };
    }
  } catch (popupErr) {
    console.warn('Popup window creation failed:', popupErr);
  }

  return null;
}

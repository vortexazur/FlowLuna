/**
 * Native System Toast Notifications for FlowLuna (Windows / Web Notifications API)
 */

export function showSystemNotification(
  title: string,
  options?: NotificationOptions,
  onClick?: () => void
): void {
  if (typeof window === 'undefined') return;

  const trigger = () => {
    try {
      const notif = new Notification(title, {
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        ...options,
      });

      if (onClick) {
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          onClick();
          try {
            notif.close();
          } catch {}
        };
      }
    } catch (err) {
      console.warn('System Notification error:', err);
    }
  };

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      trigger();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          trigger();
        }
      });
    }
  }
}

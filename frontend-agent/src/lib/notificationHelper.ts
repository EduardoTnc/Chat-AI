export async function ensureNotificationPermission(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (_) {
      /* ignored */
    }
  }
}

export function showBrowserNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

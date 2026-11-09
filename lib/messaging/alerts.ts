'use client';

/**
 * Browser-side alert helpers for cabinet messaging: a synthesized chime
 * (no audio asset to ship or cache), system notifications, and the
 * "(3) …" unread prefix on the tab title.
 */

const SOUND_KEY = 'doctopus.messaging.sound';

export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: preference just isn't remembered */
  }
}

let audioCtx: AudioContext | null = null;

/** Two soft sine notes. Silently no-ops until the page had a user gesture. */
export function playChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    for (const [i, freq] of [880, 1318.5].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    }
  } catch {
    /* audio is best-effort */
  }
}

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function notificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

const permissionListeners = new Set<() => void>();

/** useSyncExternalStore subscription; fires after requestNotificationPermission. */
export function subscribeNotificationPermission(cb: () => void): () => void {
  permissionListeners.add(cb);
  return () => {
    permissionListeners.delete(cb);
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) return 'unsupported';
  try {
    await Notification.requestPermission();
  } catch {
    /* Safari < 15 callback API: permission is read back below */
  }
  for (const cb of permissionListeners) cb();
  return Notification.permission;
}

export function showSystemNotification(opts: {
  title: string;
  body: string;
  tag: string;
  onClick: () => void;
}): void {
  if (notificationPermission() !== 'granted') return;
  try {
    const n = new Notification(opts.title, { body: opts.body, tag: opts.tag, icon: '/brand-logo.png' });
    n.onclick = () => {
      window.focus();
      opts.onClick();
      n.close();
    };
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}

const PREFIX_RE = /^\(\d+\+?\) /;

/**
 * Keeps "(n) " in front of document.title, re-applying it when Next swaps
 * the title on navigation. Returns a cleanup function.
 */
export function syncTitlePrefix(count: number): () => void {
  const apply = () => {
    const base = document.title.replace(PREFIX_RE, '');
    const want = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base;
    if (document.title !== want) document.title = want;
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  return () => {
    observer.disconnect();
    document.title = document.title.replace(PREFIX_RE, '');
  };
}

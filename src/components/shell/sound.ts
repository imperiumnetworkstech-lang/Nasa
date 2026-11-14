"use client";

/**
 * One shared AudioContext for the whole app.
 * Browsers only allow sound after the person has interacted with the page, and a context
 * created later from a timer starts "suspended". So we create one context and resume it on the
 * first click / tap / key press; after that, alarms triggered by polling can play.
 */
const SOUND_KEY = "ak-notify-sound";
type Ctx = AudioContext;
let ctx: Ctx | null = null;
const listeners = new Set<(unlocked: boolean) => void>();

export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

function getCtx(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

export function isAudioUnlocked() {
  return ctx?.state === "running";
}

export function onAudioUnlockChange(fn: (unlocked: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call from a user gesture (click/tap/key). Safe to call many times. */
export async function unlockAudio() {
  const c = getCtx();
  if (!c) return false;
  if (c.state !== "running") {
    try {
      await c.resume();
      // A silent blip fully "warms up" iOS/Safari.
      const o = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.01);
    } catch {
      /* ignore */
    }
  }
  const ok = c.state === "running";
  listeners.forEach((l) => l(ok));
  return ok;
}

let installed = false;
/** Unlock automatically on the first interaction anywhere on the page. */
export function installAudioUnlock() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const handler = () => void unlockAudio();
  for (const ev of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(ev, handler, { passive: true });
}

function tone(c: Ctx, freq: number, start: number, dur: number, vol: number, type: OscillatorType) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  g.gain.setValueAtTime(vol, start + dur - 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Soft two-note chime for ordinary notifications. */
export function playChime() {
  if (!soundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") void c.resume();
  const t = c.currentTime + 0.02;
  tone(c, 880, t, 0.3, 0.18, "sine");
  tone(c, 1318.5, t + 0.16, 0.3, 0.18, "sine");
}

let alarmTimer: ReturnType<typeof setInterval> | null = null;
let alarmStop: ReturnType<typeof setTimeout> | null = null;

function alarmBurst(c: Ctx) {
  const t = c.currentTime + 0.02;
  for (let i = 0; i < 8; i++) tone(c, i % 2 ? 660 : 990, t + i * 0.2, 0.19, 0.22, "square");
}

/**
 * Emergency siren: repeating two-tone bursts until stopAlarm() is called (or maxMs passes).
 * Also vibrates on phones.
 */
export function playAlarm(maxMs = 20_000) {
  if (!soundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") void c.resume();
  stopAlarm();
  alarmBurst(c);
  alarmTimer = setInterval(() => alarmBurst(c), 2400);
  alarmStop = setTimeout(stopAlarm, maxMs);
  try {
    navigator.vibrate?.([400, 150, 400, 150, 400]);
  } catch {
    /* ignore */
  }
}

export function stopAlarm() {
  if (alarmTimer) clearInterval(alarmTimer);
  if (alarmStop) clearTimeout(alarmStop);
  alarmTimer = null;
  alarmStop = null;
}

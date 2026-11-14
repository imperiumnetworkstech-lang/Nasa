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

let sirenNodes: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
let alarmStop: ReturnType<typeof setTimeout> | null = null;

/**
 * Emergency SIREN (ambulance-style wail): a continuous tone that sweeps smoothly up and down
 * between ~650 Hz and ~1500 Hz about every 1.6 s, with a slightly detuned second voice for a
 * fuller sound. Keeps wailing until stopAlarm() is called or maxMs passes. Vibrates on phones.
 */
export function playAlarm(maxMs = 30_000) {
  if (!soundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") void c.resume();
  stopAlarm();
  const start = c.currentTime + 0.02;
  const end = start + maxMs / 1000;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.2, start + 0.15);
  gain.gain.setValueAtTime(0.2, end - 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  // Soften the harsh edges of the sawtooth.
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;
  filter.connect(gain).connect(c.destination);
  const oscs = [0, 7].map((detune) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.detune.value = detune;
    const LOW = 650;
    const HIGH = 1500;
    const HALF = 0.8; // seconds up, then seconds down
    o.frequency.setValueAtTime(LOW, start);
    for (let t = start; t < end; t += HALF * 2) {
      o.frequency.linearRampToValueAtTime(HIGH, Math.min(end, t + HALF));
      o.frequency.linearRampToValueAtTime(LOW, Math.min(end, t + HALF * 2));
    }
    o.connect(filter);
    o.start(start);
    o.stop(end + 0.05);
    return o;
  });
  sirenNodes = { oscs, gain };
  alarmStop = setTimeout(stopAlarm, maxMs + 200);
  try {
    navigator.vibrate?.([600, 200, 600, 200, 600, 200, 600]);
  } catch {
    /* ignore */
  }
}

export function stopAlarm() {
  if (alarmStop) clearTimeout(alarmStop);
  alarmStop = null;
  if (sirenNodes && ctx) {
    const { oscs, gain } = sirenNodes;
    const now = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      oscs.forEach((o) => o.stop(now + 0.15));
    } catch {
      /* already stopped */
    }
  }
  sirenNodes = null;
  try {
    navigator.vibrate?.(0);
  } catch {
    /* ignore */
  }
}

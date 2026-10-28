/**
 * Tiny synthesized UI sounds (Web Audio, no files). Very quiet on purpose.
 * Browser-only: every entry point is a no-op during SSR.
 */

export type SoundName = "found" | "tick" | "step" | "done" | "error";

const STORAGE_KEY = "tono:sound";
const MASTER = 0.05;

let ctx: AudioContext | null = null;
const listeners = new Set<(on: boolean) => void>();

export function isSoundOn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setSoundOn(on: boolean) {
  window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  listeners.forEach((l) => l(on));
  if (on) play("tick");
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One soft sine/triangle blip with a fast attack and exponential tail. */
function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  gain = 1,
  type: OscillatorType = "sine",
) {
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(MASTER * gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(env).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function play(name: SoundName) {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case "tick":
      tone(ac, 1800, t, 0.04, 0.35, "triangle");
      break;
    case "step":
      tone(ac, 880, t, 0.12, 0.4);
      break;
    case "found":
      tone(ac, 660, t, 0.14, 0.6);
      tone(ac, 990, t + 0.07, 0.18, 0.5);
      break;
    case "done":
      tone(ac, 784, t, 0.22, 0.6);
      tone(ac, 1047, t + 0.09, 0.26, 0.55);
      tone(ac, 1568, t + 0.18, 0.4, 0.35);
      break;
    case "error":
      tone(ac, 330, t, 0.16, 0.6, "triangle");
      tone(ac, 247, t + 0.09, 0.22, 0.5, "triangle");
      break;
  }
}

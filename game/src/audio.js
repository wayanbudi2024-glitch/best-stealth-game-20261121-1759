// Synthesised footsteps and alarm cues through WebAudio — no audio
// files, no network. Everything is a no-op until the first user gesture
// creates the context, and every call is guarded so a browser without
// audio (or a headless screenshot run) never breaks the game.

export function createAudio() {
  const audio = {
    muted: false,
    ctx: null,
  };

  function ensureCtx() {
    if (audio.ctx) return audio.ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audio.ctx = new Ctor();
    } catch {
      audio.ctx = null;
    }
    return audio.ctx;
  }

  function blip(freq, duration, type, gainValue, when = 0) {
    if (audio.muted) return;
    const ctx = ensureCtx();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + duration + 0.02);
    } catch {
      // Audio is decoration; a failure must never stop the game.
    }
  }

  // A soft step: low thump. Guard steps are lower and louder so the
  // player can tell a guard's tread from their own.
  audio.playerStep = (sneaking) => blip(sneaking ? 70 : 95, 0.07, 'sine', sneaking ? 0.03 : 0.06);
  audio.guardStep = () => blip(58, 0.1, 'triangle', 0.09);
  audio.pickup = () => {
    blip(660, 0.09, 'sine', 0.08);
    blip(990, 0.14, 'sine', 0.08, 0.08);
  };
  audio.alarm = () => {
    blip(440, 0.12, 'square', 0.05);
    blip(440, 0.12, 'square', 0.05, 0.16);
  };
  audio.caught = () => {
    blip(220, 0.25, 'sawtooth', 0.07);
    blip(165, 0.35, 'sawtooth', 0.07, 0.2);
  };
  audio.levelComplete = () => {
    blip(523, 0.12, 'sine', 0.08);
    blip(659, 0.12, 'sine', 0.08, 0.11);
    blip(784, 0.2, 'sine', 0.08, 0.22);
  };
  audio.unlock = () => {
    audio.ctx = ensureCtx();
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
  };
  return audio;
}

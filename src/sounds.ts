let audioCtx: AudioContext | null = null;
let bgMusicStarted = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Short ascending arpeggio played when the user starts a new circle. */
export function playStartSound(): void {
  try {
    const ctx = getCtx();
    // A major triad staggered
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch (_) {
    // audio unavailable
  }
}

/**
 * Rising "ding" played each time a sector is completed.
 * @param sectorIndex 0-based index so pitch rises as you progress.
 */
export function playCheckpointSound(sectorIndex: number): void {
  try {
    const ctx = getCtx();
    // Rise by 2 semitones per sector (equal-temperament: 2^(1/12) per semitone)
    const semitone = Math.pow(2, 1 / 12);
    const freq = 660 * Math.pow(semitone, sectorIndex * 2);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.08, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {
    // audio unavailable
  }
}

/** Four-note fanfare played when a round ends (valid attempt). */
export function playGameOverSound(): void {
  try {
    const ctx = getCtx();
    // C5 – E5 – G5 – C6 ascending fanfare
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch (_) {
    // audio unavailable
  }
}

/**
 * Starts a gentle ambient background loop (pentatonic arpeggio + bass drone).
 * Safe to call multiple times – starts only once.
 * Must be called inside a user-interaction handler to satisfy autoplay policy.
 */
export function startBackgroundMusic(): void {
  if (bgMusicStarted) return;
  bgMusicStarted = true;
  try {
    const ctx = getCtx();

    // ── Bass drone ──────────────────────────────────────────────────────────
    [55, 82.41].forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      gain.gain.value = 0.055;
      osc.start();
    });

    // ── Pentatonic arpeggio ─────────────────────────────────────────────────
    // A minor pentatonic: A3 C4 D4 E4 G4 A4 C5 D5 E5
    const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    let idx = 0;

    function scheduleNote(): void {
      const freq = scale[idx % scale.length];
      idx++;

      // Randomly skip ~20 % of notes for rhythmic variation
      if (Math.random() > 0.2) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.048, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.start(t);
        osc.stop(t + 0.6);
      }

      // Irregular interval: 320 – 580 ms
      setTimeout(scheduleNote, 320 + Math.random() * 260);
    }

    setTimeout(scheduleNote, 600);
  } catch (_) {
    // audio unavailable
  }
}

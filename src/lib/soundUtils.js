// src/lib/soundUtils.js

// Simple Web Audio API Synthesizer for UI Sounds
let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

// Generic tone generator
const playOscillator = (freq, type = "sine", duration = 0.1, vol = 0.1, delay = 0) => {
  const ctx = initAudio();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  
  // Envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
};

export const playSound = (type) => {
  try {
    switch (type) {
      case "click":
      case "hover":
        // Soft click
        playOscillator(600, "sine", 0.05, 0.02);
        break;
      case "pop":
        // Bubble pop
        playOscillator(800, "sine", 0.08, 0.05);
        playOscillator(1200, "sine", 0.05, 0.03, 0.02);
        break;
      case "success":
        // Ascending chime
        playOscillator(523.25, "sine", 0.15, 0.05, 0);    // C5
        playOscillator(659.25, "sine", 0.15, 0.05, 0.1);  // E5
        playOscillator(783.99, "sine", 0.3, 0.05, 0.2);   // G5
        playOscillator(1046.50, "sine", 0.4, 0.05, 0.3);  // C6
        break;
      case "notification":
        // Two soft bells
        playOscillator(880, "sine", 0.2, 0.05, 0);     // A5
        playOscillator(1108.73, "sine", 0.4, 0.05, 0.15); // C#6
        break;
      case "error":
        // Low buzz
        playOscillator(150, "sawtooth", 0.2, 0.05, 0);
        playOscillator(100, "sawtooth", 0.3, 0.05, 0.15);
        break;
      default:
        break;
    }
  } catch (err) {
    // Ignore errors (e.g. if user hasn't interacted with document yet)
    console.warn("Audio play failed:", err);
  }
};

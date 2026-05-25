/**
 * 8-Bit Retro Chiptune Sound Synthesizer using Web Audio API
 * 100% offline-first, zero-assets, CORS-safe retro gaming SFX!
 */

export type SfxType = 'correct' | 'wrong' | 'victory' | 'defeat';

export const playChiptuneSFX = (type: SfxType) => {
  if (typeof window === 'undefined') return;
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Check if the audio context is suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      // Resume on any user click
      const resume = () => {
        ctx.resume();
        window.removeEventListener('click', resume);
      };
      window.addEventListener('click', resume);
    }

    if (type === 'correct') {
      // 8-Bit Laser/Sword Slash Sweep (Frequency sweep from high to low)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } 
    else if (type === 'wrong') {
      // 8-Bit Explosion/Hurt Sweep (Low pitch rumble sweep)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.22);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.22);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } 
    else if (type === 'victory') {
      // 8-Bit Happy Arpeggio Fanfare (Ascending bright notes: C4 -> E4 -> G4 -> C5)
      const notes = [261.63, 329.63, 392.00, 523.25];
      const duration = 0.11;
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * duration);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * duration);
        gain.gain.exponentialRampToValueAtTime(0.002, ctx.currentTime + idx * duration + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * duration);
        osc.stop(ctx.currentTime + idx * duration + duration);
      });
    } 
    else if (type === 'defeat') {
      // 8-Bit Sad Fanfare (Descending solemn notes: C4 -> B3 -> Bb3 -> A3)
      const notes = [261.63, 246.94, 233.08, 220.00];
      const duration = 0.18;
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * duration);
        gain.gain.setValueAtTime(0.10, ctx.currentTime + idx * duration);
        gain.gain.exponentialRampToValueAtTime(0.002, ctx.currentTime + idx * duration + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * duration);
        osc.stop(ctx.currentTime + idx * duration + duration);
      });
    }
  } catch (err) {
    console.warn("Failed to play synthesized chiptune SFX:", err);
  }
};

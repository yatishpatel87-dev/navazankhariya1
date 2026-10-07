/**
 * Web Audio API synthesizer for positive feedback chimes
 * Zero external audio files required, zero latency, 100% reliable
 */
class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Cheerful chime when student taps their photo
  playSuccessChime(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High-pitched pleasant arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.38);
      });
    } catch {
      // Ignore audio context autoplay limitations gracefully
    }
  }

  // Soft click / tap sound
  playTap(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  // Pin unlocked success sound
  playUnlock(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.setValueAtTime(880, now + 0.1);
      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.setValueAtTime(1318.51, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEffects();

/**
 * Web Speech API for voice greetings in Gujarati / Hindi / English
 */
export function speakGreeting(nameGu: string, nameEn: string, lang: 'gu' | 'en' = 'gu'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // cancel any pending speech
    const text = lang === 'gu'
      ? `નમસ્તે ${nameGu}, તમારી હાજરી પુરાઈ ગઈ!`
      : `Welcome ${nameEn}, attendance marked!`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // friendly cheerful tone

    const voices = window.speechSynthesis.getVoices();
    // Look for Gujarati voice first, then Hindi (hi-IN), then English (en-IN or en-US)
    const voice = voices.find(v => v.lang.startsWith('gu')) ||
                  voices.find(v => v.lang.startsWith('hi')) ||
                  voices.find(v => v.lang.includes('IN')) ||
                  voices.find(v => v.lang.startsWith('en'));

    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = lang === 'gu' ? 'gu-IN' : 'en-IN';

    window.speechSynthesis.speak(utterance);
  } catch {
    // Graceful fallback if speech synthesis is blocked
  }
}

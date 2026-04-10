function playTone(frequency: number, duration: number, volume = 0.25, type: OscillatorType = "sine") {
    try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch {
        // AudioContext not available — silently ignore
    }
}

export const sounds = {
    tick: () => playTone(900, 0.07, 0.12),

    agentConnected: () => {
        playTone(440, 0.12, 0.25);
        setTimeout(() => playTone(660, 0.18, 0.25), 120);
    },

    success: () => {
        playTone(523, 0.12, 0.28); // C5
        setTimeout(() => playTone(659, 0.12, 0.28), 100); // E5
        setTimeout(() => playTone(784, 0.22, 0.28), 200); // G5
    },

    attention: () => {
        playTone(880, 0.1, 0.22); // A5
        setTimeout(() => playTone(1100, 0.15, 0.25), 120); // ~C#6
    },

    error: () => {
        playTone(330, 0.14, 0.28, "square");
        setTimeout(() => playTone(220, 0.2, 0.22, "square"), 140);
    },

    complete: () => {
        playTone(523, 0.12, 0.28); // C5
        setTimeout(() => playTone(659, 0.12, 0.28), 90); // E5
        setTimeout(() => playTone(784, 0.12, 0.28), 180); // G5
        setTimeout(() => playTone(1047, 0.45, 0.3), 270); // C6
    },
};

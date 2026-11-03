/**
 * Sons do app, gerados na hora com a Web Audio API (sem arquivo de áudio).
 * O navegador só deixa tocar som depois de alguma interação do usuário; o
 * contexto é criado/reutilizado a cada chamada e retomado se estiver suspenso.
 */

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
    const Constructor = (window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext);

    if (!Constructor) {
        return null;
    }

    if (!context) {
        context = new Constructor();
    }

    return context;
}

/** Libera o áudio dentro de um clique do usuário (o navegador bloqueia sons antes disso). */
export function unlockAudio(): void {
    void audioContext()?.resume();
}

/** Toca duas notas curtas (dó e sol) para chamar a atenção do administrador. */
export function playOrderChime(): void {
    const audio = audioContext();

    if (!audio) {
        return;
    }

    void audio.resume();

    const start = audio.currentTime + 0.02;

    [[880, 0], [1174.66, 0.18]].forEach(([frequency, offset]) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.32);

        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + 0.35);
    });
}

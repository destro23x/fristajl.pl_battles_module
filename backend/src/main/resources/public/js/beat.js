/**
 * BeatPlayer — synteza rytmu hip-hopowego przez Web Audio API.
 * Kick + snare + hi-hat generowane proceduralnie, bez plików audio.
 */
export class BeatPlayer {
    #ctx = null;
    #masterGain = null;
    #audioEl = null;   // for URL-based playback
    #timer = null;
    #nextNoteTime = 0;
    #step = 0;
    #pattern = null;
    #muted = false;
    #volume = 0.7;

    static PATTERNS = {
        "Classic Hip-Hop": {
            bpm:   90,
            kick:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        },
        "Boom Bap": {
            bpm:   88,
            kick:  [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1],
        },
        "Trap": {
            bpm:   140,
            kick:  [1,0,0,0, 0,0,1,0, 0,0,0,1, 0,0,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
        },
        "Lo-Fi": {
            bpm:   72,
            kick:  [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hihat: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1],
        },
        "Drill": {
            bpm:   144,
            kick:  [1,0,0,0, 0,0,0,1, 0,1,0,0, 0,0,0,0],
            snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0],
            hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
        },
    };

    static names()  { return Object.keys(BeatPlayer.PATTERNS); }
    static random() { const n = BeatPlayer.names(); return n[Math.floor(Math.random() * n.length)]; }

    /** Call during a user-gesture to unlock AudioContext for later use. */
    init() {
        if (!this.#ctx) this.#ctx = new AudioContext();
        if (this.#ctx.state === 'suspended') this.#ctx.resume();
    }

    play(patternName) {
        this.stop();
        this.init();
        this.#pattern = BeatPlayer.PATTERNS[patternName] ?? BeatPlayer.PATTERNS["Classic Hip-Hop"];
        this.#masterGain = this.#ctx.createGain();
        this.#masterGain.gain.value = this.#muted ? 0 : this.#volume;
        this.#masterGain.connect(this.#ctx.destination);
        this.#step = 0;
        this.#nextNoteTime = this.#ctx.currentTime + 0.05;
        this.#timer = setInterval(() => this.#schedule(), 25);
    }

    /** Play audio from a URL (.mp3 / any browser-supported format). Loops until stop(). */
    playUrl(url) {
        this.stop();
        this.#audioEl = new Audio(url);
        this.#audioEl.loop   = true;
        this.#audioEl.volume = this.#muted ? 0 : this.#volume;
        this.#audioEl.play().catch(e => console.warn('[BeatPlayer] URL play failed:', e));
    }

    stop() {
        clearInterval(this.#timer);
        this.#timer = null;
        if (this.#masterGain && this.#ctx) {
            try {
                this.#masterGain.gain.exponentialRampToValueAtTime(0.001, this.#ctx.currentTime + 0.3);
            } catch (_) {}
            this.#masterGain = null;
        }
        if (this.#audioEl) {
            this.#audioEl.pause();
            this.#audioEl.src = '';
            this.#audioEl = null;
        }
        this.#pattern = null;
    }

    /** Returns new muted state. */
    toggleMute() {
        this.#muted = !this.#muted;
        if (this.#masterGain) this.#masterGain.gain.value = this.#muted ? 0 : this.#volume;
        if (this.#audioEl)    this.#audioEl.volume        = this.#muted ? 0 : this.#volume;
        return this.#muted;
    }

    // ── Private scheduler ──────────────────────────────────────────────────
    #schedule() {
        if (!this.#pattern || !this.#ctx) return;
        const stepDur = 60 / this.#pattern.bpm / 4;
        while (this.#nextNoteTime < this.#ctx.currentTime + 0.1) {
            const s = this.#step;
            if (this.#pattern.kick[s])  this.#kick(this.#nextNoteTime);
            if (this.#pattern.snare[s]) this.#snare(this.#nextNoteTime);
            if (this.#pattern.hihat[s]) this.#hihat(this.#nextNoteTime);
            this.#nextNoteTime += stepDur;
            this.#step = (s + 1) % 16;
        }
    }

    #kick(t) {
        const ctx = this.#ctx, mg = this.#masterGain;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.connect(env); env.connect(mg);
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.45);
        env.gain.setValueAtTime(1.3, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.start(t); osc.stop(t + 0.45);
    }

    #snare(t) {
        const ctx = this.#ctx, mg = this.#masterGain;
        const size = Math.floor(ctx.sampleRate * 0.12);
        const buf = ctx.createBuffer(1, size, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass'; filt.frequency.value = 2800; filt.Q.value = 0.6;
        const env = ctx.createGain();
        src.connect(filt); filt.connect(env); env.connect(mg);
        env.gain.setValueAtTime(0.85, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.start(t); src.stop(t + 0.15);
    }

    #hihat(t) {
        const ctx = this.#ctx, mg = this.#masterGain;
        const size = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, size, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'highpass'; filt.frequency.value = 8000;
        const env = ctx.createGain();
        src.connect(filt); filt.connect(env); env.connect(mg);
        env.gain.setValueAtTime(0.22, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.start(t); src.stop(t + 0.05);
    }
}

// Motor de audio 100% generado en el navegador (Web Audio API).
// Música original: una canción de cuna en Fa mayor (I–vi–IV–V) con caja de música
// y colchón suave; ambiente de bosque con viento, agua y pájaros; efectos suaves.

export type Sfx = "chime" | "pop" | "boop" | "rawr" | "whoosh" | "flap" | "paper" | "sparkle";

const NOTE = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// Progresión: F – Dm – Bb – C (dos compases cada una)
const CHORDS = [
  [53, 57, 60], // F
  [50, 53, 57], // Dm
  [46, 50, 53], // Bb
  [48, 52, 55], // C
];
// Melodía compuesta (grados en Fa pentatónica), 16 corcheas por acorde
const MELODY: Array<number | null> = [
  77, null, 72, null, 74, null, 77, 79, 77, null, null, null, 72, null, 74, null,
  74, null, 69, null, 72, null, 74, null, 72, null, 69, null, null, null, 65, null,
  70, null, 72, null, 74, null, 77, null, 74, null, 72, null, 70, null, 69, null,
  72, null, 74, 76, 79, null, 76, null, 74, null, 72, null, null, null, null, null,
];

export class AudioEngine {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  ambience: GainNode;
  sfx: GainNode;
  private reverb: ConvolverNode;
  private noise: AudioBuffer;
  private musicTimer: number | null = null;
  private birdTimer: number | null = null;
  private ambienceNodes: AudioNode[] = [];
  private nextNoteTime = 0;
  private step = 0;

  constructor(volume: number) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8);
    const wet = this.ctx.createGain();
    wet.gain.value = 0.45;
    this.reverb.connect(wet).connect(this.master);

    this.music = this.bus(0.5);
    this.ambience = this.bus(0.55);
    this.sfx = this.bus(0.7);
    this.noise = this.noiseBuffer(4);
    this.setVolume(volume);
  }

  private bus(level: number) {
    const g = this.ctx.createGain();
    g.gain.value = level;
    g.connect(this.master);
    g.connect(this.reverb);
    return g;
  }

  private impulse(seconds: number) {
    const rate = this.ctx.sampleRate;
    const len = rate * seconds;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  private noiseBuffer(seconds: number) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate * seconds, rate);
    const d = buf.getChannelData(0);
    // ruido rosado aproximado (Paul Kellet)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
    return buf;
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  setVolume(v: number) {
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.9, t, 0.25);
  }

  // ——— Ambiente de bosque ———
  startAmbience() {
    if (this.ambienceNodes.length) return;
    const ctx = this.ctx;
    // viento
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lp.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.5;
    wind.connect(lp).connect(windGain).connect(this.ambience);
    // arroyo / cascada lejana
    const water = ctx.createBufferSource();
    water.buffer = this.noise;
    water.loop = true;
    water.playbackRate.value = 1.3;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1500;
    bp.Q.value = 0.6;
    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.16;
    water.connect(bp).connect(waterGain).connect(this.ambience);
    wind.start();
    water.start();
    lfo.start();
    this.ambienceNodes.push(wind, water, lfo);
    this.scheduleBird();
  }

  stopAmbience() {
    for (const n of this.ambienceNodes) {
      try {
        (n as AudioScheduledSourceNode).stop();
      } catch {
        /* ya detenido */
      }
    }
    this.ambienceNodes = [];
    if (this.birdTimer) window.clearTimeout(this.birdTimer);
    this.birdTimer = null;
  }

  private scheduleBird() {
    this.birdTimer = window.setTimeout(() => {
      this.bird();
      this.scheduleBird();
    }, 2200 + Math.random() * 5200);
  }

  private bird() {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.02;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.ambience);
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1400;
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * (0.11 + Math.random() * 0.06);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t);
      o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * 0.95, t + 0.09);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  // ——— Música ———
  startMusic() {
    if (this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.15;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.scheduler(), 90);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduler() {
    const eighth = 60 / 72 / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.35) {
      const s = this.step % MELODY.length;
      const chord = CHORDS[Math.floor(s / 16) % CHORDS.length];
      if (s % 16 === 0) this.pad(chord, this.nextNoteTime, eighth * 16);
      if (s % 4 === 2) this.bell(NOTE(chord[(s / 4) % 3 | 0] + 12), this.nextNoteTime, 0.05);
      const m = MELODY[s];
      if (m) this.bell(NOTE(m), this.nextNoteTime, 0.09);
      this.nextNoteTime += eighth;
      this.step++;
    }
  }

  private pad(chord: number[], t: number, dur: number) {
    for (const n of chord) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.value = NOTE(n);
      o.detune.value = Math.random() * 8 - 4;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.028, t + 1.4);
      g.gain.setValueAtTime(0.028, t + dur - 0.8);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
      o.connect(g).connect(this.music);
      o.start(t);
      o.stop(t + dur + 0.7);
    }
  }

  /** Tono de caja de música: fundamental + parcial inarmónico con decaimiento rápido */
  private bell(freq: number, t: number, level: number, out: AudioNode = this.music) {
    const partials: Array<[number, number, number]> = [
      [1, level, 1.6],
      [2.76, level * 0.35, 0.5],
      [5.4, level * 0.12, 0.2],
    ];
    for (const [mult, amp, decay] of partials) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  // ——— Efectos ———
  play(name: Sfx) {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case "chime":
        [77, 81, 84, 89].forEach((n, i) => this.bell(NOTE(n), t + i * 0.13, 0.12, this.sfx));
        break;
      case "sparkle":
        [89, 93, 96].forEach((n, i) => this.bell(NOTE(n), t + i * 0.06, 0.05, this.sfx));
        break;
      case "pop": {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(180, t + 0.14);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(this.sfx);
        o.start(t);
        o.stop(t + 0.2);
        this.noiseBurst(t, 0.06, 3000, 0.15);
        break;
      }
      case "boop": {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(520, t);
        o.frequency.exponentialRampToValueAtTime(780, t + 0.09);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(this.sfx);
        o.start(t);
        o.stop(t + 0.18);
        break;
      }
      case "rawr": {
        // un "rawr" tierno: diente de sierra filtrado con vibrato
        const o = ctx.createOscillator();
        const vib = ctx.createOscillator();
        const vibG = ctx.createGain();
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(330, t);
        o.frequency.linearRampToValueAtTime(520, t + 0.12);
        o.frequency.linearRampToValueAtTime(290, t + 0.45);
        vib.frequency.value = 28;
        vibG.gain.value = 18;
        vib.connect(vibG).connect(o.frequency);
        f.type = "bandpass";
        f.frequency.value = 1100;
        f.Q.value = 1.4;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(f).connect(g).connect(this.sfx);
        o.start(t);
        vib.start(t);
        o.stop(t + 0.55);
        vib.stop(t + 0.55);
        break;
      }
      case "whoosh": {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 1.2;
        f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(2600, t + 0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.2);
        g.gain.linearRampToValueAtTime(0, t + 0.7);
        src.connect(f).connect(g).connect(this.sfx);
        src.start(t, Math.random() * 2);
        src.stop(t + 0.75);
        break;
      }
      case "flap":
        for (let i = 0; i < 3; i++) this.noiseBurst(t + i * 0.12, 0.07, 700, 0.18);
        break;
      case "paper":
        for (let i = 0; i < 5; i++) this.noiseBurst(t + i * 0.045 + Math.random() * 0.02, 0.03, 5200, 0.12);
        break;
    }
  }

  private noiseBurst(t: number, dur: number, freq: number, level: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 3);
    src.stop(t + dur + 0.02);
  }

  async suspend() {
    this.stopMusic();
    this.stopAmbience();
    if (this.ctx.state === "running") await this.ctx.suspend();
  }
}

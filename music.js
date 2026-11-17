// ===== Música generativa: "Réquiem algorítmico" =====
// Re frigio, 66 BPM. Campana fúnebre,
// arpegio euclidiano que muta, latido, glitches y gotas que suenan al caer.
window.Requiem = (() => {
  let ac, master, comp, verb, delay, dfb, dlp, droneF, droneG, drone = [], running = false, timer;
  let flame = 0.6;
  const BPM = 66, STEP = 60 / BPM / 4;            // semicorcheas
  const ROOT = 36.71;                              // Re1
  const PHRYG = [0, 1, 3, 5, 7, 8, 10];            // Re Mib Fa Sol La Sib Do
  const PROG = [0, 8, 5, 1];                       // i – VI – iv – bII (Re, Sib, Sol, Mib)
  const hz = semi => ROOT * Math.pow(2, semi / 12);
  const deg = (d, oct) => PHRYG[((d % 7) + 7) % 7] + 12 * (oct + Math.floor(d / 7));

  // ---- utilidades ----
  function impulse(sec, decay){
    const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++){ const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, decay); }
    return b;
  }
  let noiseBuf;
  function noise(){ const s = ac.createBufferSource(); s.buffer = noiseBuf; return s; }
  function euclid(k, n, rot){ const p = []; for (let i = 0; i < n; i++) p.push(((i + rot) * k) % n < k ? 1 : 0); return p; }
  // LFSR de 16 bits: la "semilla" del algoritmo melódico
  let lfsr = 0xACE1;
  function rnd(){ const bit = ((lfsr >> 0) ^ (lfsr >> 2) ^ (lfsr >> 3) ^ (lfsr >> 5)) & 1; lfsr = (lfsr >> 1) | (bit << 15); return lfsr / 65536; }

  function out(node, wet = 0.4, dly = 0){
    const dry = ac.createGain(); dry.gain.value = 1; node.connect(dry); dry.connect(master);
    const w = ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(verb);
    if (dly){ const d = ac.createGain(); d.gain.value = dly; node.connect(d); d.connect(delay); }
  }

  // ---- voces ----
  function bell(t, f, vol, dec, wet = 0.6){       // FM inarmónica: campana
    const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    car.frequency.value = f; mod.frequency.value = f * 1.414;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dec);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    out(g, wet, 0.25);
    car.start(t); mod.start(t); car.stop(t + dec + .1); mod.stop(t + dec + .1);
  }
  function pluck(t, f, vol){                      // arpegio: triángulo + filtro que se cierra
    const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.003;
    const g2 = ac.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(lp);
    lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(600 + flame * 2600, t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.5);
    o.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    out(g, 0.35, 0.45);
    o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
  }
  function heart(t, vol){                         // latido: seno grave con caída de tono
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.25);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); out(g, 0.15); o.start(t); o.stop(t + 0.5);
  }
  function tick(t, vol, freq){                    // hats/glitch de ruido filtrado
    const s = noise(), bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(bp); bp.connect(g); out(g, 0.2, 0.2);
    s.start(t, Math.random()); s.stop(t + 0.05);
  }
  function glitch(t){                              // ráfaga digital (cuando nace un panel de código)
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square';
    const base = hz(deg(Math.floor(rnd()*7), 5));
    for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(base * [1, 2, 1.5, 4, 3, 2][i], t + i * 0.022);
    g.gain.setValueAtTime(0.018, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); out(g, 0.5, 0.5); o.start(t); o.stop(t + 0.16);
  }

  // ---- secuenciador ----
  let step = 0, nextT = 0, bar = 0, chord = 0;
  let arpPat = euclid(5, 16, 0), hatPat = euclid(7, 16, 2), melIdx = 0;
  function setChord(t, c){
    const root = PROG[c];
    const notes = [root, root + 7, root + 12, root + 15 + (c === 1 ? 1 : 0)];
    if (!drone.length) return;
    drone.forEach((o, i) => o.frequency.setTargetAtTime(hz(notes[i % notes.length]) * (1 + (i - 2) * 0.002), t, 1.2));
  }
  function schedule(){
    while (nextT < ac.currentTime + 0.12){
      const t = nextT, s = step % 16;
      if (s === 0){
        if (bar % 4 === 0){ chord = (bar / 4) % PROG.length; setChord(t, chord); }
        if (bar % 8 === 0){                       // el algoritmo muta
          arpPat = euclid(3 + Math.floor(rnd()*5), 16, Math.floor(rnd()*16));
          hatPat = euclid(5 + Math.floor(rnd()*6), 16, Math.floor(rnd()*16));
        }
        if (bar % 2 === 0) bell(t, hz(PROG[chord] + 24), 0.11, 6.5, 0.8);   // campana fúnebre
        bar++;
      }
      if (s === 0 || s === 3) heart(t, s === 0 ? 0.35 : 0.2);
      if (arpPat[s]){
        // melodía: caminata aleatoria sobre la escala, dirigida por el LFSR
        melIdx += [-2, -1, -1, 1, 1, 2, 3, -3][Math.floor(rnd()*8)];
        melIdx = Math.max(-3, Math.min(9, melIdx));
        pluck(t, hz(deg(melIdx + [0, 5, 3, 1][chord], 3)), 0.07 + flame * 0.05);
      }
      if (hatPat[s] && rnd() < 0.8) tick(t, 0.025 + 0.02 * (s % 4 === 2), 4000 + rnd() * 6000);
      if (rnd() < 0.02 + flame * 0.04) tick(t + rnd() * STEP, 0.05 * flame, 1500 + rnd()*1500);  // chisporroteo
      step++; nextT += STEP * (s % 2 ? 0.94 : 1.06);   // ligero swing
    }
  }

  function init(){
    ac = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random()*2-1;
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = 0;
    master.connect(comp); comp.connect(ac.destination);
    verb = ac.createConvolver(); verb.buffer = impulse(5, 3);
    const vg = ac.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
    delay = ac.createDelay(2); delay.delayTime.value = STEP * 3;          // corchea con puntillo
    dfb = ac.createGain(); dfb.gain.value = 0.42; dlp = ac.createBiquadFilter(); dlp.frequency.value = 1800;
    delay.connect(dlp); dlp.connect(dfb); dfb.connect(delay);
    const dg = ac.createGain(); dg.gain.value = 0.5; dlp.connect(dg); dg.connect(master); dlp.connect(verb);
    setChord(ac.currentTime, 0);
    nextT = ac.currentTime + 0.1;
  }

  return {
    toggle(){
      if (!ac) init();
      running = !running;
      const t = ac.currentTime;
      if (running){
        ac.resume(); master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(0.8, t, 1.5);
        nextT = Math.max(nextT, ac.currentTime + 0.05);
        timer = setInterval(schedule, 25);
      } else {
        master.gain.setTargetAtTime(0, t, 0.4); clearInterval(timer);
      }
      return running;
    },
    get on(){ return running; },
    // la animación empuja su estado al audio
    flame(f){ flame = f; },
    drip(x, y){ if (!running) return;                    // gota que toca el suelo
      const d = Math.floor((1760 - y) / 60) + Math.floor(x / 400);
      bell(ac.currentTime, hz(deg(d, 5)), 0.035, 1.6, 0.7); },
    code(){ if (running && Math.random() < 0.6) glitch(ac.currentTime + 0.01); },
    freeze(p){ if (!ac) return; p ? ac.suspend() : (running && ac.resume()); }
  };
})();

/* Ses efektleri – tümü WebAudio ile anında üretilir, dosya gerekmez. */
(function () {
  var ctx = null, master = null, enabled = true;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, opts) {
    opts = opts || {};
    var c = ac(); if (!c || !enabled) return;
    var t = c.currentTime + start;
    var o = c.createOscillator(), g = c.createGain();
    o.type = opts.type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    var v = opts.vol == null ? 0.3 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(opts.dest || master);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  function noise(start, dur, opts) {
    opts = opts || {};
    var c = ac(); if (!c || !enabled) return;
    var t = c.currentTime + start;
    var len = Math.ceil(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource(); s.buffer = buf;
    var f = c.createBiquadFilter(); f.type = opts.filter || "bandpass"; f.frequency.value = opts.freq || 1000; f.Q.value = opts.q || 1;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol || 0.2, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur);
  }

  var FX = {
    tap: function () { tone(660, 0, 0.08, { type: "triangle", vol: 0.15 }); },
    start: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.08, 0.22, { type: "triangle", vol: 0.25 }); }); },
    correct: function () {
      [659, 831, 988, 1319].forEach(function (f, i) { tone(f, i * 0.07, 0.35, { type: "triangle", vol: 0.28 }); });
      noise(0.28, 0.5, { filter: "highpass", freq: 6000, vol: 0.08 });
    },
    wrong: function () {
      tone(300, 0, 0.25, { type: "sawtooth", to: 180, vol: 0.12 });
      tone(200, 0.2, 0.35, { type: "sawtooth", to: 110, vol: 0.12 });
    },
    tick: function () { tone(1400, 0, 0.05, { type: "square", vol: 0.06 }); },
    timeup: function () { tone(440, 0, 0.2, { type: "square", vol: 0.1 }); tone(330, 0.22, 0.4, { type: "square", vol: 0.1 }); },
    whoosh: function () { noise(0, 0.35, { filter: "bandpass", freq: 1200, q: 0.7, vol: 0.12, attack: 0.15 }); },
    fanfare: function () {
      var seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4], [784, 0.62], [1047, 0.76]];
      seq.forEach(function (s) { tone(s[0], s[1], 0.4, { type: "triangle", vol: 0.28 }); tone(s[0] / 2, s[1], 0.4, { type: "sine", vol: 0.15 }); });
      noise(0.8, 0.9, { filter: "highpass", freq: 5000, vol: 0.07 });
    }
  };

  window.SFX = {
    unlock: function () { ac(); },
    play: function (name) { try { FX[name] && FX[name](); } catch (e) {} },
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; }
  };
})();

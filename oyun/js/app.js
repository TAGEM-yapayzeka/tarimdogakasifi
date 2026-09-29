/* Tarım & Doğa Kâşifi – kiosk oyun motoru */
(() => {
  "use strict";
  const C = window.CONFIG, A = window.ART, SFX = window.SFX;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const TYPE_LABEL = {
    choice: "Bilgi sorusu", truefalse: "Doğru mu, yanlış mı?",
    silhouette: "Siluet bilmecesi", map: "Nerede yetişir, nerede yaşar?"
  };
  const CAT_LABEL = { tarim: "Tarım", doga: "Doğa" };
  const levelFor = (age) => +Object.keys(C.LEVELS).find((k) => age <= C.LEVELS[k].maxAge);
  const ageLabel = (age) => (age <= 6 ? "6 yaş ve altı" : age >= 18 ? "18 yaş ve üstü" : age + " yaş");

  const S = {
    screen: "attract", group: null, age: 0, level: 1, T: 15, qs: [], idx: 0, score: 0, correct: 0,
    locked: false, qStart: 0, raf: 0, lastSec: null, touchedThisQ: false, timeoutStreak: 0,
    fbTimer: 0, lastTouch: Date.now(), name: "", recent: [], guardUntil: 0, cancelDrag: null
  };
  // Ekran/soru değişiminden hemen sonraki dokunuşlar yok sayılır (çift dokunma bir sonraki ekranda seçim yapmasın)
  const guarded = () => performance.now() < S.guardUntil;
  const armGuard = () => { S.guardUntil = performance.now() + 400; };

  // ---------------- yardımcılar ----------------
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const titleFor = (n) => C.TITLES.find((t) => n >= t.min);
  const licTr = (l) => (/public domain/i.test(l) ? "Kamu malı" : l);
  const decodeUrl = (u) => { try { return decodeURI(u); } catch (e) { return u; } };

  // ---------------- liderlik tablosu & istatistik ----------------
  const LB = {
    key: () => "kiosk-lb-" + today(),
    all() { return store.get(this.key(), []); },
    top() { return this.all().slice(0, C.LEADERBOARD_SIZE); },
    add(entry) {
      const list = this.all(); list.push(entry);
      list.sort((a, b) => b.s - a.s || a.t - b.t);
      store.set(this.key(), list.slice(0, 100));
    },
    rankFor(score) { return 1 + this.all().filter((e) => e.s >= score).length; },
    reset() { store.del(this.key()); },
    remove(t) { store.set(this.key(), this.all().filter((e) => e.t !== t)); },
    // KVKK: yalnızca bugünün listesi tutulur; önceki günlerin adları silinir
    purgeOld() {
      try {
        const cur = this.key();
        Object.keys(localStorage).filter((k) => k.indexOf("kiosk-lb-") === 0 && k !== cur).forEach((k) => localStorage.removeItem(k));
      } catch (e) {}
    }
  };
  const STATS = {
    key: () => "kiosk-stats-" + today(),
    get() { return store.get(this.key(), { games: 0, sum: 0, perfect: 0, abandoned: 0 }); },
    bump(f) { const s = this.get(); f(s); store.set(this.key(), s); }
  };

  const MEDAL = ["🥇", "🥈", "🥉"];
  function renderBoards() {
    const top = LB.top();
    const dot = (g) => (g === "minik" ? "💚" : "🔵"); // eski Android sürümlerinde de görünen emojiler
    $("#board-list").innerHTML = top.length
      ? top.map((e, i) => `<li><span class="rk">${MEDAL[i] || i + 1}</span><span class="nm">${esc(e.n)}</span><span class="gp">${dot(e.g)}</span><b>${e.s}</b></li>`).join("")
      : `<li class="empty">Henüz kimse yok.<br>İlk kâşif sen ol! 🌱</li>`;
    const PROMO = `<span class="tk">Hızlı cevap = daha çok puan ⚡</span><span class="tk">5'te 5 yapana stantta sürpriz hediye 🎁</span>`;
    const items = top.length
      ? top.map((e, i) => `<span class="tk">${MEDAL[i] || i + 1 + "."} ${esc(e.n)} ${dot(e.g)} <b>${e.s}</b></span>`).join("") + (top.length < 4 ? PROMO : "")
      : `<span class="tk">Günün ilk kâşifi sen ol! 🌱</span>` + PROMO;
    $("#ticker").innerHTML = items + items; // kesintisiz kayan şerit için iki kopya
  }

  // ---------------- ekran yönetimi ----------------
  function show(name) {
    S.screen = name;
    $$(".screen").forEach((el) => el.classList.toggle("active", el.id === "scr-" + name));
    document.body.dataset.screen = name;
    S.lastTouch = Date.now();
    armGuard();
  }

  function goAttract() {
    stopTimer(); clearTimeout(S.fbTimer);
    S.cancelDrag = null;
    ["#credits", "#feedback", "#pinpad", "#admin"].forEach((s) => $(s).classList.remove("show"));
    renderBoards();
    show("attract");
  }

  // Boşta kalma: dokunma yoksa karşılama ekranına dön
  setInterval(() => {
    const idle = Date.now() - S.lastTouch;
    if (idle > C.IDLE_MS) ["#credits", "#pinpad"].forEach((s) => $(s).classList.remove("show"));
    if (idle > C.IDLE_MS_RESULT) $("#admin").classList.remove("show");
    if (S.screen === "age" && idle > C.IDLE_MS) goAttract();
    if ((S.screen === "result" || S.screen === "name") && idle > C.IDLE_MS_RESULT) goAttract();
    if (S.screen === "badge") {
      const left = Math.ceil((C.IDLE_MS_RESULT - idle) / 1000);
      $("#autoback").textContent = left > 0 ? `${left} sn sonra ana ekrana dönülecek` : "";
      if (left <= 0) goAttract();
    }
  }, 1000);

  document.addEventListener("pointerdown", () => {
    S.lastTouch = Date.now(); S.touchedThisQ = true; SFX.unlock();
  }, true);
  document.addEventListener("click", (e) => {
    if (guarded() && e.target.closest && e.target.closest("#stage")) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // Seçenekler parmak değer değmez kabul edilir: basılı tutunca Android'in "uzun basma"sı tıklamayı yutmasın.
  // click yedektir (fare/klavye); işlemler kilitli olduğundan iki kez çalışmaz.
  function onPress(el, fn) {
    el.addEventListener("pointerdown", (e) => { if (!e.isPrimary || e.button > 0 || guarded()) return; fn(); });
    el.addEventListener("click", () => { if (!guarded()) fn(); });
  }
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  // ---------------- soru seçimi ----------------
  // Soru seçimi: her oyunda OWN_LEVEL_PER_GAME soru kendi seviyesinden, kalanı bir alt/üst seviyeden.
  // Sorular ağırlıklı kurayla gelir; ne zaman sorulduklarının kaydı tablette saklanır (uygulama kapansa da sürer).
  const QSEEN_KEY = "kiosk-qseen";
  function loadSeen() { try { return JSON.parse(localStorage.getItem(QSEEN_KEY)) || {}; } catch (e) { return {}; } }
  function pickQuestions(level) {
    const N = C.QUESTIONS_PER_GAME, own = Math.min(N, C.OWN_LEVEL_PER_GAME != null ? C.OWN_LEVEL_PER_GAME : 3);
    const all = window.QUESTIONS.minik.concat(window.QUESTIONS.muhafiz);
    const seen = loadSeen();
    // Her oyunda ağırlıklı kura: uzun süredir sorulmayanın şansı yüksek, hiç sorulmamışın daha da yüksek;
    // son 3 oyunda sorulanlar gelmez (havuz yetmezse en sona kalır). Böylece sorular hem rastgele hem adil döner.
    const now = seen._t || 0;
    const weight = (q) => {
      if (seen[q.id] === undefined) return 1000;
      const age = now - seen[q.id]; // kaç oyun önce soruldu
      return age <= 3 ? 0 : Math.pow(Math.min(age, 20), 2);
    };
    const draw = (list) => list.map((q) => { const w = weight(q); return { q, k: w > 0 ? Math.pow(Math.random(), 1 / w) : -Math.random() }; })
      .sort((a, b) => b.k - a.k).map((x) => x.q);
    const same = draw(all.filter((q) => q.lv === level));
    const near = draw(all.filter((q) => Math.abs(q.lv - level) === 1));
    const typeCount = {}, catCount = {}, out = [];
    const maxCat = Math.ceil(N / 2);
    const take = (list, limit) => {
      for (const q of list) {
        if (out.length >= limit) break;
        if (out.includes(q) || (typeCount[q.type] || 0) >= 2 || (catCount[q.cat] || 0) >= maxCat) continue;
        out.push(q); typeCount[q.type] = (typeCount[q.type] || 0) + 1; catCount[q.cat] = (catCount[q.cat] || 0) + 1;
      }
    };
    take(same, own); take(near, N); take(same, N); // komşu seviye yetmezse kendi seviyeden tamamla
    for (const q of same.concat(near)) if (out.length < N && !out.includes(q)) out.push(q); // güvenlik: havuz küçükse doldur
    shuffle(out); // sıra da her oyunda rastgele (kendi seviye soruları hep başta olmasın)
    // aynı tip soruların art arda gelmemesine çalış
    for (let t = 0; t < 30; t++) {
      if (out.every((q, i) => !i || out[i - 1].type !== q.type)) break;
      shuffle(out);
    }
    seen._t = (seen._t || 0) + 1;
    out.forEach((q) => { seen[q.id] = seen._t; });
    try { localStorage.setItem(QSEEN_KEY, JSON.stringify(seen)); } catch (e) { /* depolama yoksa yalnız bu oturumda döner */ }
    return out;
  }

  // ---------------- oyun akışı ----------------
  function startGame(age) {
    S.age = age; S.level = levelFor(age); S.T = C.LEVELS[S.level].seconds;
    S.group = age <= 11 ? "minik" : "muhafiz"; // tablo/rozet rengi ve kategori adı için
    S.qs = pickQuestions(S.level); S.idx = 0; S.score = 0; S.correct = 0; S.timeoutStreak = 0;
    S.qs.forEach((q) => { q._result = null; });
    $("#score").textContent = "0";
    SFX.play("start");
    show("quiz");
    renderQuestion();
  }

  function renderProgress() {
    $("#progress").innerHTML = S.qs.map((q, i) => {
      const st = q._result ? " " + q._result : i === S.idx ? " now" : "";
      return `<i class="pdot${st}">${i + 1}</i>`;
    }).join("");
  }

  function optionButtons(q, withIcons) {
    const order = shuffle(q.options.map((_, i) => i));
    return `<div class="opts n${order.length}">` + order.map((i) => {
      const o = q.options[i];
      const pic = withIcons && (o.i || o.p) ? A.art(o.i, "opt-icon", o.p) : "";
      return `<button class="opt${pic.includes("art-photo") ? " has-photo" : ""}" data-i="${i}">${pic}<span class="opt-text">${esc(o.t)}</span></button>`;
    }).join("") + "</div>";
  }

  function renderQuestion() {
    const q = S.qs[S.idx];
    q._result = null;
    S.locked = false; S.touchedThisQ = false; S.cancelDrag = null;
    armGuard();
    renderProgress();
    $("#q-type").innerHTML = A.icon(q.type) + esc(q.typeLabel || TYPE_LABEL[q.type]);
    $("#q-cat").innerHTML = A.icon(q.cat) + CAT_LABEL[q.cat];
    $("#q-cat").className = "chip cat-" + q.cat;
    $("#q-text").textContent = q.q;
    const body = $("#q-body");
    body.className = "q-body t-" + q.type;

    if (q.type === "choice") {
      body.innerHTML = optionButtons(q, true);
    } else if (q.type === "silhouette") {
      const ph = A.photo(q.photo);
      body.innerHTML = `<div class="sil-stage"><div class="sil-glow"></div>${A.art(q.art, "sil")}${ph ? `<img class="sil-photo" src="${ph.src}" alt="" draggable="false">` : ""}</div>` + optionButtons(q, false);
    } else if (q.type === "truefalse") {
      const ph = A.photo(q.photo);
      body.innerHTML = `<div class="tf${ph ? " with-photo" : ""}">
        <button class="tf-btn tf-no" data-v="false"><span class="tf-ico">✖</span><b>YANLIŞ</b></button>
        ${ph ? `<figure class="tf-photo"><img src="${ph.src}" alt="" draggable="false"></figure>` : ""}
        <button class="tf-btn tf-yes" data-v="true"><span class="tf-ico">✔</span><b>DOĞRU</b></button></div>`;
    } else if (q.type === "map") {
      body.innerHTML = `<div class="map-tray">
          <div class="token${A.photo(q.photo) ? " has-photo" : ""}" id="token">${A.art(q.item, "token-art", q.photo)}<b>${esc(q.label)}</b></div>
          <p class="hint">👆 Parmağınla haritada<br>doğru şehre sürükle</p>
        </div>
        <div class="map-area" id="map-area">${A.turkeyMap(q.cities)}</div>`;
      setupMap(q);
    }

    $$(".opt", body).forEach((b) => onPress(b, () => choose(q, +b.dataset.i === q.answer, b)));
    $$(".tf-btn", body).forEach((b) => onPress(b, () => choose(q, (b.dataset.v === "true") === q.answer, b)));

    body.classList.remove("enter"); void body.offsetWidth; body.classList.add("enter");
    startTimer();
  }

  // ---------------- harita sürükle-bırak ----------------
  function setupMap(q) {
    const token = $("#token"), area = $("#map-area");
    let drag = null, hover = null;

    const cityCenter = (g) => { const r = $(".city-dot", g).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const cityG = (key) => $(`.city[data-city="${key}"]`, area);
    const provOf = (g) => g && $(`.prov[data-prov="${g.dataset.city}"]`, area);
    // Önce şehir noktasına yakınlık; değilse parmağın altındaki aday il
    const nearest = (x, y) => {
      const lim = Math.max(70, area.getBoundingClientRect().width * 0.06);
      let best = null, bd = lim;
      $$(".city", area).forEach((g) => { const [cx, cy] = cityCenter(g); const d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = g; } });
      if (best) return best;
      const under = document.elementsFromPoint(x, y).find((el) => el.classList && el.classList.contains("prov") && el.classList.contains("cand"));
      return under ? cityG(under.dataset.prov) : null;
    };
    const mark = (g, cls, on) => { if (!g) return; g.classList.toggle(cls, on); const pv = provOf(g); pv && pv.classList.toggle(cls, on); };
    const setHover = (g) => { if (hover === g) return; mark(hover, "hover", false); hover = g; mark(g, "hover", true); };

    // Süre dolunca yarım kalan sürüklemeyi bırak: jeton tepsiye döner, vurgu söner
    S.cancelDrag = () => { if (!drag) return; drag = null; setHover(null); token.classList.remove("dragging"); token.style.transform = ""; };
    token.addEventListener("pointerdown", (e) => {
      if (S.locked || drag || guarded()) return; // ikinci parmak sürüklemeyi devralmasın
      e.preventDefault();
      try { token.setPointerCapture(e.pointerId); } catch (err) { /* yakalanamasa da sürükleme sürer */ }
      const r = token.getBoundingClientRect();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left + r.width / 2, oy: r.top + r.height / 2 };
      token.classList.add("dragging");
    });
    token.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id || S.locked) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      token.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      setHover(nearest(e.clientX, e.clientY));
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      token.classList.remove("dragging");
      // Bırakılan yer parmağın kalktığı noktadır (yavaş cihazda son hareket olayı hedefin gerisinde kalabilir); iptal cevap sayılmaz
      const target = e.type === "pointerup" ? (Number.isFinite(e.clientX) && nearest(e.clientX, e.clientY)) || hover : null;
      drag = null; setHover(null);
      if (target && !S.locked) dropOn(target); else token.style.transform = "";
    };
    token.addEventListener("pointerup", end);
    token.addEventListener("pointercancel", end);
    token.addEventListener("lostpointercapture", (e) => { if (drag && e.pointerId === drag.id) end({ type: "pointercancel", pointerId: e.pointerId }); });

    // Sürükleyemeyenler için: şehre doğrudan dokunmak da cevap sayılır
    $$(".city", area).forEach((g) => onPress(g, () => { if (!S.locked && !drag) dropOn(g); }));
    $$(".prov.cand", area).forEach((pv) => onPress(pv, () => { if (!S.locked && !drag) dropOn(cityG(pv.dataset.prov)); }));

    function dropOn(g) {
      const [cx, cy] = cityCenter(g);
      const r = token.getBoundingClientRect();
      const cur = new DOMMatrix(getComputedStyle(token).transform);
      token.classList.add("placed");
      token.style.transform = `translate(${cur.m41 + cx - (r.left + r.width / 2)}px, ${cur.m42 + cy - (r.top + r.height / 2)}px) scale(.55)`;
      const ok = g.dataset.city === q.answer;
      mark(g, ok ? "correct" : "wrong", true);
      if (!ok) mark(cityG(q.answer), "reveal", true);
      choose(q, ok, null);
    }
  }

  // ---------------- zamanlayıcı ----------------
  const RING = 2 * Math.PI * 52;
  function startTimer() {
    stopTimer();
    S.qStart = performance.now(); S.lastSec = null;
    const ring = $("#timer-ring"), num = $("#timer-num"), box = $("#timer");
    ring.style.strokeDasharray = RING;
    const T = S.T;
    const loop = (now) => {
      const rem = Math.max(0, T - (now - S.qStart) / 1000);
      ring.style.strokeDashoffset = RING * (1 - rem / T);
      const sec = Math.ceil(rem);
      if (sec !== S.lastSec) {
        S.lastSec = sec; num.textContent = sec;
        box.className = "timer" + (rem <= 5 ? " crit" : rem <= 9 ? " warn" : "");
        if (rem > 0 && sec <= 5 && sec < T) SFX.play("tick");
      }
      if (rem <= 0) return timeUp();
      S.raf = requestAnimationFrame(loop);
    };
    S.raf = requestAnimationFrame(loop);
  }
  function stopTimer() { cancelAnimationFrame(S.raf); S.raf = 0; }
  function remaining() { return Math.max(0, S.T - (performance.now() - S.qStart) / 1000); }

  function timeUp() {
    const q = S.qs[S.idx];
    if (S.locked) return;
    S.timeoutStreak = S.touchedThisQ ? 0 : S.timeoutStreak + 1;
    if (S.timeoutStreak >= C.ABANDON_AFTER_TIMEOUTS) {
      STATS.bump((s) => s.abandoned++);
      return goAttract();
    }
    SFX.play("timeup");
    resolve(q, false, true, null);
  }

  // ---------------- cevaplama ----------------
  function choose(q, ok, btn) {
    if (S.locked) return;
    S.timeoutStreak = 0;
    resolve(q, ok, false, btn);
  }

  function resolve(q, ok, timedOut, btn) {
    S.locked = true;
    if (S.cancelDrag) S.cancelDrag();
    const rem = remaining();
    stopTimer();
    let gained = 0;
    if (ok) {
      gained = C.BASE_POINTS + Math.round(C.TIME_BONUS * rem / S.T);
      S.score += gained; S.correct++;
    }
    q._result = ok ? "ok" : "bad";
    renderProgress();

    // seçenekleri işaretle
    const body = $("#q-body");
    body.classList.add("locked");
    if (btn) btn.classList.add(ok ? "correct" : "wrong");
    $$(".opt", body).forEach((b) => { if (+b.dataset.i === q.answer) b.classList.add("correct"); else if (b !== btn) b.classList.add("dim"); });
    $$(".tf-btn", body).forEach((b) => { if ((b.dataset.v === "true") === q.answer) b.classList.add("correct"); else if (b !== btn) b.classList.add("dim"); });
    const sil = $(".sil-stage", body); if (sil) sil.classList.add("reveal");
    if (q.type === "map" && !ok) $$(`.city[data-city="${q.answer}"], .prov[data-prov="${q.answer}"]`, body).forEach((el) => el.classList.add("reveal"));

    if (ok) {
      SFX.play("correct"); flash("ok");
      const r = (btn || $("#q-body")).getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 60);
      floatPoints(gained);
      bumpScore();
    } else {
      if (!timedOut) SFX.play("wrong");
      flash("bad");
    }
    clearTimeout(S.fbTimer);
    S.fbTimer = setTimeout(() => showFeedback(q, ok, timedOut, gained), ok ? 750 : 950);
  }

  function correctAnswerText(q) {
    if (q.type === "truefalse") return q.answer ? "DOĞRU" : "YANLIŞ";
    if (q.type === "map") return A.CITIES[q.answer].name;
    return q.options[q.answer].t;
  }

  function showFeedback(q, ok, timedOut, gained) {
    if (S.screen !== "quiz") return;
    const fb = $("#feedback");
    fb.className = "overlay fb show " + (ok ? "is-ok" : "is-bad");
    $("#fb-head").innerHTML = ok
      ? `<span class="fb-emoji">🎉</span> Harika! <b class="plus">+${gained}</b>`
      : timedOut ? `<span class="fb-emoji">⏰</span> Süre doldu!` : `<span class="fb-emoji">🤔</span> Olmadı!`;
    $("#fb-answer").innerHTML = ok ? ""
      : q.type === "truefalse" ? `Bu bilgi <b>${q.answer ? "DOĞRU" : "YANLIŞ"}</b>.`
      : `Doğru cevap: <b>${esc(correctAnswerText(q))}</b>`;
    // Harita cevabı ekranın alt yarısındaysa kart üste çıkar, doğru il görünsün
    const low = q.type === "map" && A.CITIES[q.answer].xy[1] > window.TR_MAP.h * 0.5;
    fb.classList.toggle("top", low);
    $("#fb-fact").textContent = q.fact;
    const phKey = q.photo || (q.type === "choice" && q.options[q.answer].p);
    const ph = A.photo(phKey);
    const fig = $("#fb-photo");
    fig.hidden = !ph;
    if (ph) $("img", fig).src = ph.src; // künyeler "Fotoğraf ve harita kaynakları" ekranında
    fb.classList.toggle("has-photo", !!ph);
    // Okuma süresi: yaşa göre okuma hızı × (bilgi metni + doğru cevap satırı); en az/en çok sınırlı
    const perChar = S.age <= 8 ? C.FEEDBACK_MS_PER_CHAR_KUCUK : S.age <= 11 ? C.FEEDBACK_MS_PER_CHAR_MINIK : C.FEEDBACK_MS_PER_CHAR;
    const chars = q.fact.length + (ok ? 0 : $("#fb-answer").textContent.length);
    const ms = Math.round(Math.min(C.FEEDBACK_MS_MAX, Math.max(ok ? C.FEEDBACK_MS_CORRECT : C.FEEDBACK_MS_WRONG, C.FEEDBACK_MS_BASE + chars * perChar)));
    const bar = $("#fb-bar");
    bar.style.transition = "none"; bar.style.width = "0%"; void bar.offsetWidth;
    bar.style.transition = `width ${ms}ms linear`; bar.style.width = "100%";
    $("#fb-next").textContent = S.idx + 1 < S.qs.length ? "Sıradaki soru ➜" : "Sonucumu gör 🏁";
    clearTimeout(S.fbTimer);
    S.fbTimer = setTimeout(next, ms);
  }

  function next() {
    const fb = $("#feedback");
    if (!fb.classList.contains("show")) return; // çift dokunma / otomatik geçişle yarış: soru atlanmasın
    clearTimeout(S.fbTimer);
    fb.classList.remove("show");
    if (S.screen !== "quiz" || !S.locked) return;
    S.idx++;
    if (S.idx < S.qs.length) { SFX.play("whoosh"); renderQuestion(); } else finish();
  }

  // ---------------- sonuç ----------------
  function finish() {
    const N = S.qs.length, t = titleFor(S.correct);
    STATS.bump((s) => { s.games++; s.sum += S.score; if (S.correct === N) s.perfect++; });
    show("result");
    $("#res-icon").textContent = t.icon;
    $("#res-title").textContent = t.name;
    $("#res-sub").textContent = `${N} sorudan ${S.correct} doğru · ${ageLabel(S.age)}`;
    $("#res-stars").innerHTML = Array.from({ length: N }, (_, i) => `<i class="${i < S.correct ? "on" : ""}" style="animation-delay:${0.25 + i * 0.12}s">★</i>`).join("");
    $("#res-gift").hidden = S.correct !== N;
    const rank = LB.rankFor(S.score);
    $("#res-rank").innerHTML = S.score > 0 && rank <= C.LEADERBOARD_SIZE
      ? `Adını yazarsan günün sıralamasında <b>${rank}.</b> olursun! 🚀`
      : "Rozetini oluştur, telefonuna kaydet! 📱";
    countUp($("#res-score"), S.score, 1200);
    if (S.correct >= 3) { SFX.play("fanfare"); FX.rain(S.correct === N ? 260 : 140); } else SFX.play("start");
  }

  function countUp(el, to, ms, from = 0) {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.max(0, Math.min(1, (now - t0) / ms));
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------------- ad girişi & rozet ----------------
  const kb = window.Keyboard.mount($("#keyboard"), {
    maxLen: C.NAME_MAX_LEN,
    onChange: (v) => { $("#name-val").textContent = v; $("#name-warn").textContent = ""; $("#name-field").classList.toggle("empty", !v); },
    onLimit: () => { $("#name-warn").textContent = `Ad en fazla ${C.NAME_MAX_LEN} harf olabilir.`; }
  });

  function openName() { kb.clear(); S.surnameAsked = false; show("name"); }

  function confirmName() {
    const raw = kb.get().trim();
    if (!raw) { $("#name-warn").textContent = "Adını yazmadın. İstersen “Adsız devam et”e dokunabilirsin."; return; }
    if (!window.Keyboard.isClean(raw)) { kb.clear(); $("#name-warn").textContent = "Bu adı yazamıyoruz 🙂 Başka bir ad dene ya da “Adsız devam et”e dokun."; return; }
    // Yalnız ad yazıldıysa bir kez soyadını hatırlat; yine "Tamam" denirse adla devam et
    if (raw.split(/\s+/).length < 2 && !S.surnameAsked) {
      S.surnameAsked = true;
      $("#name-warn").textContent = "Belgende görünmesi için soyadını da yazabilirsin. Yazmak istemezsen yeniden “Tamam”a dokun.";
      return;
    }
    S.name = window.Keyboard.titleCase(raw);
    // Herkese açık tabloya yalnızca ad + soyadının baş harfi yazılır; tam ad sadece rozette
    if (S.score > 0) LB.add({ n: window.Keyboard.publicName(S.name), s: S.score, c: S.correct, g: S.group, t: Date.now() });
    renderBoards();
    openBadge();
  }

  function b64url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Rozet sayfasının adresi: config'teki geçerli http(s) adresi; yoksa yalnızca ağdan (LAN) sunuluyorsa kendi adresi.
  // file:// veya localhost telefona açılamaz, bu durumda QR gösterilmez.
  function badgeBase() {
    const b = String(C.BADGE_BASE_URL || "").trim();
    if (/^https?:\/\/\S+$/i.test(b)) return b.endsWith("/") ? b : b + "/";
    if (/^https?:$/.test(location.protocol) && !/^(localhost|127\.|\[::1\]$)/i.test(location.hostname)
        && location.hostname !== "appassets.androidplatform.net") return new URL(".", location.href).href; // Android uygulamasının iç adresi telefondan açılamaz
    return "";
  }

  // Kâşif Kartı için fotoğraf: bu oyunda doğru bilinen sorulardaki tür/ürünlerden biri
  function cardPhotoKey() {
    const keys = [];
    S.qs.forEach((q) => {
      if (q._result !== "ok") return;
      if (q.photo) keys.push(q.photo);
      if (q.type === "choice" && q.options[q.answer].p) keys.push(q.options[q.answer].p);
    });
    return window.KasifCard.pickPhoto(keys, S.correct ? "bugday" : "filiz");
  }

  function openBadge() {
    const N = S.qs.length, t = titleFor(S.correct);
    const d = new Date();
    const no = STATS.get().games;
    // Kart fotoğrafı: "Türkiye'nin Endemik Türleri" serisinin sıradaki türü (seri boşsa oyundaki doğru cevaplardan)
    const photoKey = window.KasifCard.endemicFor(no, today()) || cardPhotoKey();
    const dateTxt = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const payload = { n: S.name, s: S.score, c: S.correct, q: N, t: t.name, i: t.icon, g: S.group, d: today(), a: S.age, p: photoKey, no };
    const tier = window.KasifCard.tierFor(S.correct, N);
    $("#kcard-wrap").className = "kcard tier-" + tier;
    window.KasifCard.draw($("#kcard"), { name: S.name, title: t.name, score: S.score, correct: S.correct, total: N, age: S.age, date: dateTxt, no, photoKey });
    const base = badgeBase();
    $("#qr-box").hidden = !base;
    $("#qr-off").hidden = !!base;
    S.badge = base ? { base, payload } : null;
    drawQR(null);
    $("#autoback").textContent = `${Math.ceil(C.IDLE_MS_RESULT / 1000)} sn sonra ana ekrana dönülecek`;
    show("badge");
    FX.burst(innerWidth * 0.35, innerHeight * 0.45, 80);
  }

  // QR: sembole dokunulduysa telefondaki kart sayfası o uygulamanın "paylaş" düğmesiyle açılır (sh)
  const SHARE_NAME = { ig: "Instagram'da", wa: "WhatsApp'ta", fb: "Facebook'ta", x: "X'te" };
  function drawQR(sh) {
    if (!S.badge) return;
    S.shareTo = sh;
    const payload = Object.assign({}, S.badge.payload);
    if (sh) payload.sh = sh;
    const qr = qrcode(0, "M");
    qr.addData(S.badge.base + "badge.html#" + b64url(JSON.stringify(payload)));
    qr.make();
    $("#qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    $("#qr-social").classList.toggle("picked", !!sh);
    $$("#qr-social .soc").forEach((b) => { const on = b.dataset.sh === sh; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    $("#qr-hint").innerHTML = sh ? `📱 Şimdi telefonunla tara,<br><b>${SHARE_NAME[sh]} paylaş!</b>` : "📱 Telefonunun kamerasıyla tara,<br><b>Kâşif Kartını kaydet ve paylaş!</b>";
    $("#qr-pick").textContent = sh ? "Başka bir yer için sembole dokun" : "👆 Paylaşacağın yere dokun";
    $("#qr-pick").classList.toggle("on", !!sh);
  }
  // Aç/kapa: dokunuşta hemen çalışır, ardından gelen click yok sayılır (fare/klavye için click yedekte)
  $$("#qr-social .soc").forEach((b) => {
    let downAt = 0;
    const act = () => { SFX.play("tap"); drawQR(S.shareTo === b.dataset.sh ? null : b.dataset.sh); };
    b.addEventListener("pointerdown", (e) => { if (!e.isPrimary || e.button > 0) return; downAt = performance.now(); act(); });
    b.addEventListener("click", () => { if (performance.now() - downAt > 800) act(); });
  });

  // ---------------- efektler ----------------
  function flash(kind) {
    const f = $("#flash");
    f.className = ""; void f.offsetWidth; f.className = kind;
  }
  function floatPoints(n) {
    const el = document.createElement("div");
    el.className = "float-pts"; el.textContent = "+" + n;
    $("#scr-quiz").appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
  function bumpScore() {
    const el = $("#score");
    countUp(el, S.score, 500, +el.textContent || 0);
    el.parentElement.classList.remove("bump"); void el.offsetWidth; el.parentElement.classList.add("bump");
  }

  const FX = (() => {
    const cv = $("#fx"), cx = cv.getContext("2d");
    let parts = [], running = false;
    const COLORS = ["#f5c542", "#22c55e", "#e30a17", "#ffffff", "#38bdf8", "#a3e635"];
    const size = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
    addEventListener("resize", size); size();
    const add = (x, y, vx, vy) => parts.push({ x, y, vx, vy, r: 4 + Math.random() * 6, c: COLORS[Math.random() * COLORS.length | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, life: 1 });
    function loop() {
      cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      cx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 20);
      for (const p of parts) {
        p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; p.life -= 0.006;
        cx.save(); cx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); cx.translate(p.x, p.y); cx.rotate(p.a);
        cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore();
      }
      if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    return {
      burst(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9; add(x, y, Math.cos(a) * s, Math.sin(a) * s - 5); } kick(); },
      rain(n) { for (let i = 0; i < n; i++) add(Math.random() * innerWidth, -20 - Math.random() * innerHeight * 0.6, (Math.random() - 0.5) * 3, Math.random() * 3); kick(); }
    };
  })();

  // Yıldızlı gökyüzü (tek seferlik box-shadow katmanları)
  (function stars() {
    ["s1", "s2", "s3"].forEach((id, k) => {
      const n = [140, 60, 25][k], out = [];
      for (let i = 0; i < n; i++) out.push(`${(Math.random() * 100).toFixed(2)}vw ${(Math.random() * 75).toFixed(2)}vh rgba(255,255,255,${(0.35 + Math.random() * 0.6).toFixed(2)})`);
      $("#" + id).style.boxShadow = out.join(",");
    });
  })();

  // ---------------- yönetici paneli ----------------
  const ADMIN = (() => {
    let pin = "", holdTimer = 0, fails = 0, lockedUntil = 0;
    const hot = $("#admin-hot");
    // Sol üst köşeye 3 sn basılı tutunca PIN ekranı açılır (meraklı dokunuşlarla açılmasın)
    hot.addEventListener("pointerdown", () => { clearTimeout(holdTimer); holdTimer = setTimeout(openPin, 3000); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => hot.addEventListener(ev, () => clearTimeout(holdTimer)));
    function openPin() { pin = ""; renderPin(); $("#pinpad").classList.add("show"); }
    function renderPin() { $("#pin-dots").textContent = "●".repeat(pin.length) + "○".repeat(Math.max(0, C.ADMIN_PIN.length - pin.length)); }
    $$("#pinpad [data-p]").forEach((b) => b.addEventListener("click", () => {
      const p = b.dataset.p;
      if (p === "x") { $("#pinpad").classList.remove("show"); return; }
      if (p === "<") pin = pin.slice(0, -1); else pin += p;
      renderPin();
      if (Date.now() < lockedUntil) { pin = ""; $("#pin-dots").textContent = "Bekleyin…"; return; }
      if (pin.length >= C.ADMIN_PIN.length) {
        if (pin === C.ADMIN_PIN) { fails = 0; $("#pinpad").classList.remove("show"); openPanel(); }
        else {
          pin = ""; fails++;
          if (fails >= 3) { fails = 0; lockedUntil = Date.now() + 60000; } // 3 hatalı denemede 1 dk kilit
          $("#pin-dots").classList.add("shake"); setTimeout(() => { $("#pin-dots").classList.remove("shake"); renderPin(); }, 400);
        }
      }
    }));
    function openPanel() {
      const s = STATS.get();
      $("#adm-stats").innerHTML = `
        <div><b>${s.games}</b><span>tamamlanan oyun</span></div>
        <div><b>${s.games ? Math.round(s.sum / s.games) : 0}</b><span>ortalama puan</span></div>
        <div><b>${s.perfect}</b><span>5/5 (hediye)</span></div>
        <div><b>${s.abandoned}</b><span>yarıda bırakılan</span></div>
        <div><b>${LB.all().length}</b><span>tabloya yazılan</span></div>`;
      $("#adm-info").innerHTML = `Tarih: ${today()}<br>Rozet adresi: ${C.BADGE_BASE_URL ? esc(C.BADGE_BASE_URL) : "<em>ayarlanmadı (js/config.js)</em>"}`;
      const top = LB.top();
      $("#adm-lb").innerHTML = top.length
        ? top.map((e) => `<li><span>${esc(e.n)}</span><b>${e.s}</b><button class="ghost adm-del" data-t="${e.t}" type="button">Sil</button></li>`).join("")
        : "<li><em>Bugün tabloda kimse yok.</em></li>";
      $$(".adm-del", $("#adm-lb")).forEach((b) => b.addEventListener("click", () => { LB.remove(+b.dataset.t); renderBoards(); openPanel(); }));
      renderKiosk();
      $("#adm-sound").textContent = SFX.isEnabled() ? "🔊 Ses: AÇIK" : "🔇 Ses: KAPALI";
      $("#adm-reset").textContent = "🗑️ Liderlik tablosunu sıfırla";
      $("#adm-reset").dataset.arm = "";
      $("#admin").classList.add("show");
    }
    // Android uygulamasında: tablet kilit durumu (sabitleme, ekran kilidi PIN'i, ana ekran) ve görevli düğmeleri
    function renderKiosk() {
      const box = $("#adm-kiosk"), K = window.AndroidKiosk;
      box.hidden = !K;
      if (!K) return;
      let st = {};
      try { st = JSON.parse(K.status()); } catch (e) { st = {}; }
      const row = (ok, good, bad) => `<li class="${ok ? "ok" : "bad"}">${ok ? good : bad}</li>`;
      box.innerHTML = `<ul>
          ${row(st.pinned, "Oyun ekrana sabitli.", "Oyun ekrana sabitli DEĞİL: çocuklar oyundan çıkabilir. “📌 Sabitle”ye dokunun.")}
          ${row(st.screenLock, "Tablette ekran kilidi PIN'i var.", "Tablette ekran kilidi PIN'i YOK: sabitleme PIN sormadan kalkar. Ayarlar → Kilit ekranı → PIN.")}
          ${row(st.home, "Ana ekran uygulaması bu oyun: ana ekran tuşu ve yeniden başlatma oyuna döner.", "Ana ekran uygulaması bu oyun değil. “🏠 Ana ekran uygulaması”na dokunup Tarım & Doğa Kâşifi'ni seçin.")}
        </ul>
        <div class="adm-kbtns">
          <button class="ghost" type="button" data-k="pin">📌 Sabitle</button>
          <button class="ghost" type="button" data-k="openHomeSettings">🏠 Ana ekran uygulaması</button>
          <button class="ghost" type="button" data-k="openSettings">⚙️ Tablet ayarları (10 dk)</button>
        </div>
        <small>Uygulama sürümü ${esc(String(st.version || ""))}</small>`;
      $$("[data-k]", box).forEach((b) => b.addEventListener("click", () => {
        const fn = b.dataset.k;
        $("#admin").classList.remove("show");
        try { K[fn](); } catch (e) { /* eski sürüm */ }
      }));
    }
    $("#adm-close").addEventListener("click", () => $("#admin").classList.remove("show"));
    $("#adm-sound").addEventListener("click", () => {
      SFX.setEnabled(!SFX.isEnabled()); store.set("kiosk-sound", SFX.isEnabled());
      $("#adm-sound").textContent = SFX.isEnabled() ? "🔊 Ses: AÇIK" : "🔇 Ses: KAPALI";
    });
    $("#adm-reset").addEventListener("click", (e) => {
      const b = e.currentTarget;
      if (!b.dataset.arm) { b.dataset.arm = "1"; b.textContent = "⚠️ Emin misiniz? Tekrar dokunun"; return; }
      LB.reset(); renderBoards(); openPanel();
    });
    $("#adm-full").hidden = !document.fullscreenEnabled; // Android uygulaması zaten tam ekran
    $("#adm-full").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
    });
  })();

  // ---------------- bağlantılar ----------------
  $("#btn-start").addEventListener("click", () => { SFX.play("tap"); show("age"); });
  $("#scr-attract").addEventListener("click", (e) => { if (!e.target.closest("button") && !e.target.closest(".board")) { SFX.play("tap"); show("age"); } });
  $("#age-grid").innerHTML = C.AGES.map((age) => `<button class="age-btn lv${levelFor(age)}" data-age="${age}" type="button">` +
    (age <= 6 ? `6<small>ve altı</small>` : age >= 18 ? `18<small>ve üstü</small>` : age) + `</button>`).join("");
  $$(".age-btn").forEach((b) => onPress(b, () => { if (S.screen === "age") startGame(+b.dataset.age); }));
  $$("[data-go='attract']").forEach((b) => b.addEventListener("click", goAttract));
  $("#fb-next").addEventListener("click", next);
  $("#btn-quit").addEventListener("click", () => { STATS.bump((s) => s.abandoned++); goAttract(); });
  $("#btn-badge").addEventListener("click", openName);
  $("#btn-finish").addEventListener("click", goAttract);
  $("#btn-name-ok").addEventListener("click", confirmName);
  $("#btn-skip").addEventListener("click", () => { S.name = "Doğa Kâşifi"; openBadge(); });
  $("#btn-done").addEventListener("click", goAttract);
  $("#btn-credits").addEventListener("click", (e) => {
    e.stopPropagation();
    const P = window.PHOTOS || {};
    $("#credits-list").innerHTML = Object.keys(P).sort().map((k) => `<li><b>${esc(P[k].title || k)}</b> — ${esc(P[k].by)} · ${esc(licTr(P[k].lic))}<br><small>${esc(decodeUrl(P[k].url || ""))}</small></li>`).join("") +
      `<li><b>Türkiye haritası</b> — ${esc(A.mapCredit)}</li>`;
    $("#credits").classList.add("show");
  });
  $("#credits-close").addEventListener("click", () => $("#credits").classList.remove("show"));

  LB.purgeOld();
  SFX.setEnabled(store.get("kiosk-sound", true));
  // Karşılama ekranı: gerçek fotoğraflardan dönen kart destesi
  (function deck() {
    const CARDS = [
      ["kelaynak", "Kelaynak", "Birecik"], ["ceylan", "Ceylan", "Ceylanpınar"], ["pamuk", "Pamuk", "Harran Ovası"],
      ["antep-fistigi", "Antep fıstığı", "Gaziantep"], ["firat-kaplumbagasi", "Fırat kaplumbağası", "Fırat–Dicle"], ["bal-arisi", "Bal arısı", "Tozlaşma"],
      ["inci-kefali", "İnci kefali", "Van Gölü"], ["anadolu-parsi", "Anadolu parsı", "Anadolu"], ["bugday", "Buğday", "Karacadağ"],
      ["kayisi", "Kayısı", "Malatya"], ["findik", "Fındık", "Giresun"], ["isot", "İsot", "Şanlıurfa"]
    ].filter((c) => A.photo(c[0]));
    const el = $("#deck");
    if (!CARDS.length) { el.parentElement.hidden = true; return; }
    el.innerHTML = CARDS.map((c, i) => `<figure class="pc" style="--tilt:${[-5, 4, -2, 6, -4, 3][i % 6]}deg">
      <img src="${A.photo(c[0]).src}" alt="" draggable="false"><figcaption><b>${esc(c[1])}</b><span>${esc(c[2])}</span></figcaption></figure>`).join("");
    const cards = $$(".pc", el);
    let order = cards.map((_, i) => i);
    const layout = () => order.forEach((ci, pos) => {
      const c = cards[ci];
      c.style.zIndex = cards.length - pos;
      c.dataset.pos = pos < 3 ? pos : "hidden";
    });
    layout();
    setInterval(() => {
      if (S.screen !== "attract" || document.hidden) return;
      const top = cards[order[0]];
      top.classList.add("leave");
      setTimeout(() => { top.classList.remove("leave"); order.push(order.shift()); layout(); }, 650);
    }, 3200);
  })();
  $$(".ico-wrap[data-icon]").forEach((el) => (el.innerHTML = A.icon(el.dataset.icon)));
  renderBoards();
  setInterval(() => { LB.purgeOld(); renderBoards(); }, 60000); // gün değişince tablo kendiliğinden sıfırlanır

  // Ekran kararmasın (Windows güç planına karşı); desteklenmezse sessizce geçilir
  let wakeLock = null;
  const keepAwake = () => {
    if (!navigator.wakeLock || document.visibilityState !== "visible" || (wakeLock && !wakeLock.released)) return;
    navigator.wakeLock.request("screen").then((l) => { wakeLock = l; }).catch(() => {});
  };
  document.addEventListener("visibilitychange", keepAwake);
  document.addEventListener("pointerdown", keepAwake);
  keepAwake();

  // test/otomasyon için
  window.__kiosk = { S, LB, STATS, startGame, goAttract, pickQuestions, renderQuestion, finish, openBadge, openName, show };
})();

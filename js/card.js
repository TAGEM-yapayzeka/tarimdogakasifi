/* Kâşif Kartı – koleksiyon kartı çizimi (kiosk ve telefon rozet sayfası aynı kodu kullanır).
   Kart 1080×1512 piksel; canvas'a çizilir, telefonda aynı canvas PNG olarak kaydedilir. */
(function () {
  var W = 1080, H = 1512;
  var HEAD = '"Poppins", "Segoe UI", system-ui, sans-serif';
  var BODY = '"Mulish", "Segoe UI", system-ui, sans-serif';

  var TIERS = {
    gold: { label: "ALTIN KÂŞİF KARTI", accent: "#f2c14e", text: "#ffe29a", stops: ["#fff3b0", "#f2c14e", "#b8861b", "#ffe9a0", "#c9962b", "#fff3b0"] },
    silver: { label: "GÜMÜŞ KÂŞİF KARTI", accent: "#dfe6ee", text: "#eef2f6", stops: ["#ffffff", "#cfd6de", "#8b96a3", "#f4f6f8", "#9aa3ad", "#ffffff"] },
    bronze: { label: "BRONZ KÂŞİF KARTI", accent: "#e3a36f", text: "#ffd1a8", stops: ["#ffd9b8", "#d08a52", "#8a4a22", "#f2b98a", "#a0582a", "#ffd9b8"] },
    sprout: { label: "FİDAN KÂŞİF KARTI", accent: "#9be27a", text: "#c9f2b0", stops: ["#c9f2b0", "#7ccf5a", "#2f7a22", "#b7ee98", "#3f8f2b", "#c9f2b0"] }
  };
  function tierFor(correct, total) {
    if (correct >= total && total > 0) return "gold";
    if (correct >= 3) return "silver";
    if (correct >= 1) return "bronze";
    return "sprout";
  }

  // Kartta fotoğrafın altında görünen ad ve yöre
  var PLACES = {
    kelaynak: "Birecik", ceylan: "Ceylanpınar", "firat-kaplumbagasi": "Fırat–Dicle", "inci-kefali": "Van Gölü",
    "anadolu-parsi": "Anadolu", isot: "Şanlıurfa", pamuk: "Harran Ovası", "antep-fistigi": "Gaziantep", bugday: "Karacadağ",
    cay: "Rize", findik: "Giresun", kayisi: "Malatya", "yag-gulu": "Isparta", "tiftik-kecisi": "Ankara", "bal-arisi": "Tozlaşma",
    filiz: "Tohumdan fidana", baykus: "Çiftçinin dostu", "ugur-bocegi": "Doğal mücadele"
  };
  // Birden çok doğru cevap varsa karta en "yıldız" tür çıksın
  var PRIORITY = ["kelaynak", "ceylan", "anadolu-parsi", "firat-kaplumbagasi", "inci-kefali", "isot", "pamuk", "antep-fistigi",
    "bugday", "tiftik-kecisi", "yag-gulu", "kayisi", "findik", "cay", "bal-arisi", "baykus", "kelebek", "ugur-bocegi"];
  function pickPhoto(keys, fallback) {
    var have = (keys || []).filter(function (k) { return window.PHOTOS && window.PHOTOS[k]; });
    for (var i = 0; i < PRIORITY.length; i++) if (have.indexOf(PRIORITY[i]) >= 0) return PRIORITY[i];
    return have[0] || fallback || "filiz";
  }

  var imgCache = {};
  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (!imgCache[src]) {
      imgCache[src] = new Promise(function (res) {
        var im = new Image();
        im.onload = function () { res(im); };
        im.onerror = function () { res(null); };
        im.src = src;
      });
    }
    return imgCache[src];
  }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(["800 90px Poppins", "600 40px Poppins", "800 30px Mulish", "500 24px Mulish"].map(function (f) {
      return document.fonts.load(f, "ŞşĞğİıÖöÇçÜüÂâ").catch(function () {});
    }));
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function metal(c, stops, x0, y0, x1, y1) {
    var g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); });
    return g;
  }
  function fit(c, text, weight, size, min, fam, maxW) {
    while (size > min) { c.font = weight + " " + size + "px " + fam; if (c.measureText(text).width <= maxW) break; size -= 2; }
    c.font = weight + " " + size + "px " + fam;
    return size;
  }
  function star(c, cx, cy, r, fill) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
      c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  function cover(c, img, x, y, w, h) {
    var s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
    c.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.45, sw, sh, x, y, w, h);
  }
  function containH(c, img, x, y, h) { // yüksekliğe sığdır, genişliği döndür
    if (!img) return 0;
    var w = img.width * h / img.height; c.drawImage(img, x, y, w, h); return w;
  }

  /* data: { name, title, score, correct, total, age, date, no, photoKey, base }
     base: varlıkların bulunduğu klasörün öneki ("" ya da "./") */
  function draw(canvas, data) {
    var base = data.base || "";
    var P = (window.PHOTOS && window.PHOTOS[data.photoKey]) || null;
    // "Türkiye'nin Endemik Türleri" serisi: js/endemics.js
    var E = window.ENDEMICS || [], ei = -1;
    for (var k = 0; k < E.length; k++) if (E[k].key === data.photoKey) { ei = k; break; }
    var sp = ei >= 0 ? E[ei] : null;
    var tier = TIERS[tierFor(data.correct, data.total)];
    return Promise.all([
      fonts(),
      loadImg(P ? base + P.src : null),
      loadImg(base + "assets/logos/bakanlik.png"), loadImg(base + "assets/logos/tagem.png"),
      loadImg(base + "assets/logos/teknofest.png"), loadImg(base + "assets/logos/milli-teknoloji-hamlesi.png")
    ]).then(function (r) {
      var photo = r[1], lBak = r[2], lTag = r[3], lTf = r[4], lMth = r[5];
      canvas.width = W; canvas.height = H;
      var c = canvas.getContext("2d");
      c.clearRect(0, 0, W, H);

      // metal çerçeve
      rr(c, 0, 0, W, H, 64); c.fillStyle = metal(c, tier.stops, 0, 0, W, H); c.fill();
      // çerçevede parlama bandı
      c.save(); rr(c, 0, 0, W, H, 64); c.clip();
      var sh = c.createLinearGradient(0, 0, W, H);
      sh.addColorStop(0.28, "rgba(255,255,255,0)"); sh.addColorStop(0.36, "rgba(255,255,255,.55)"); sh.addColorStop(0.44, "rgba(255,255,255,0)");
      c.fillStyle = sh; c.fillRect(0, 0, W, H); c.restore();

      // iç panel
      var ix = 34, iy = 34, iw = W - 68, ih = H - 68;
      rr(c, ix, iy, iw, ih, 40);
      var bg = c.createLinearGradient(0, iy, 0, iy + ih);
      bg.addColorStop(0, "#16296a"); bg.addColorStop(0.55, "#0b1638"); bg.addColorStop(1, "#071029");
      c.fillStyle = bg; c.fill();
      c.save(); rr(c, ix, iy, iw, ih, 40); c.clip();
      var glow = c.createRadialGradient(W / 2, 330, 40, W / 2, 330, 620);
      glow.addColorStop(0, "rgba(242,193,78,.18)"); glow.addColorStop(1, "rgba(242,193,78,0)");
      c.fillStyle = glow; c.fillRect(ix, iy, iw, ih);
      c.restore();

      // başlık: kart türü + yıldızlar
      c.textBaseline = "middle";
      c.fillStyle = tier.accent; c.font = "800 34px " + HEAD;
      c.fillText(tier.label, 80, 100);
      for (var i = 0; i < data.total; i++) star(c, W - 90 - (data.total - 1 - i) * 52, 100, 22, i < data.correct ? tier.accent : "rgba(253,248,239,.18)");

      // fotoğraf penceresi
      var px = 72, py = 140, pw = W - 144, ph = 640;
      c.save(); rr(c, px, py, pw, ph, 30); c.clip();
      if (photo) cover(c, photo, px, py, pw, ph); else { c.fillStyle = "#1d3a7a"; c.fillRect(px, py, pw, ph); }
      var fade = c.createLinearGradient(0, py + ph - 260, 0, py + ph);
      fade.addColorStop(0, "rgba(7,16,41,0)"); fade.addColorStop(1, "rgba(7,16,41,.9)");
      c.fillStyle = fade; c.fillRect(px, py + ph - 260, pw, 260);
      c.restore();
      rr(c, px, py, pw, ph, 30); c.lineWidth = 8; c.strokeStyle = metal(c, tier.stops, px, py, px + pw, py + ph); c.stroke();
      if (sp) {
        // ENDEMİK etiketi + seri numarası
        var tag = "ENDEMİK · " + (ei + 1) + "/" + E.length;
        c.font = "800 26px " + HEAD; var tw = c.measureText(tag).width + 44;
        rr(c, px + 26, py + 26, tw, 52, 26); c.fillStyle = "rgba(7,16,41,.78)"; c.fill();
        c.lineWidth = 3; c.strokeStyle = tier.accent; c.stroke();
        c.fillStyle = tier.text; c.fillText(tag, px + 48, py + 53);
        c.fillStyle = "#fdf8ef"; fit(c, sp.name, "800", 56, 32, HEAD, pw - 90);
        c.fillText(sp.name, px + 44, py + ph - 118);
        c.fillStyle = "rgba(253,248,239,.82)"; fit(c, sp.latin, "italic 500", 30, 20, BODY, pw - 90);
        c.fillText(sp.latin, px + 46, py + ph - 74);
        c.fillStyle = tier.text; c.font = "800 28px " + BODY; c.fillText(sp.region, px + 46, py + ph - 34);
      } else if (P) {
        c.fillStyle = "#fdf8ef"; fit(c, P.title, "800", 58, 34, HEAD, pw - 90);
        c.fillText(P.title, px + 44, py + ph - 88);
        var place = PLACES[data.photoKey];
        if (place) { c.fillStyle = tier.text; c.font = "800 30px " + BODY; c.fillText(place, px + 46, py + ph - 38); }
      }
      if (P) {
        c.fillStyle = "rgba(253,248,239,.55)"; c.font = "500 19px " + BODY; c.textAlign = "right";
        var lic = /public domain/i.test(P.lic) ? "Kamu malı" : P.lic;
        var cred = "Foto: " + P.by + " · " + lic + " · Wikimedia Commons";
        fit(c, cred, "500", 19, 13, BODY, pw); c.fillText(cred, px + pw, py + ph + 26); c.textAlign = "left";
      }

      // ad ve unvan
      c.textAlign = "center"; c.fillStyle = "#fdf8ef";
      fit(c, data.name, "800", 92, 48, HEAD, W - 160);
      c.fillText(data.name, W / 2, 878);
      c.fillStyle = tier.text; fit(c, data.title, "800", 50, 30, HEAD, W - 200);
      c.fillText(data.title, W / 2, 956);

      // istatistik kutuları
      var boxes = [["PUAN", String(data.score)], ["DOĞRU", data.correct + "/" + data.total], ["YAŞ", data.age ? (data.age >= 18 ? "18+" : String(data.age)) : "–"]];
      var bw = 280, gap = 28, bx = (W - (bw * 3 + gap * 2)) / 2, by = 1004, bh = 148;
      boxes.forEach(function (b, k) {
        var x = bx + k * (bw + gap);
        rr(c, x, by, bw, bh, 26); c.fillStyle = "rgba(253,248,239,.07)"; c.fill();
        c.lineWidth = 2; c.strokeStyle = "rgba(227,163,111,.35)"; c.stroke();
        c.fillStyle = "rgba(253,248,239,.62)"; c.font = "800 24px " + BODY; c.fillText(b[0], x + bw / 2, by + 42);
        c.fillStyle = k === 0 ? tier.text : "#fdf8ef"; c.font = "800 62px " + HEAD; c.fillText(b[1], x + bw / 2, by + 102);
      });

      // logolar: beyaz plaka (Bakanlık + TAGEM) ve TEKNOFEST + Milli Teknoloji Hamlesi
      var ly = 1196, lh = 128;
      rr(c, 80, ly, 470, lh, 26); c.fillStyle = "#ffffff"; c.fill();
      var lx = 100 + containH(c, lBak, 100, ly + 14, 100) + 22;
      containH(c, lTag, lx, ly + 24, 80);
      var rx = W - 80, tfW = lTf ? lTf.width * 118 / lTf.height : 0, mthW = lMth ? lMth.width * 92 / lMth.height : 0;
      containH(c, lMth, rx - mthW, ly + 18, 92);
      containH(c, lTf, rx - mthW - 34 - tfW, ly + 6, 118);

      // alt bilgi
      c.fillStyle = "rgba(253,248,239,.78)"; c.font = "800 28px " + BODY; c.textAlign = "left";
      c.fillText("TEKNOFEST Güneydoğu 2026 · Şanlıurfa", 80, 1392);
      c.textAlign = "right"; c.fillStyle = tier.accent; c.font = "800 28px " + HEAD;
      c.fillText((data.no ? "No. " + String(data.no).padStart(4, "0") + " · " : "") + (data.date || ""), W - 80, 1392);
      c.textAlign = "left";
      c.fillStyle = "rgba(253,248,239,.5)"; c.font = "500 22px " + BODY;
      c.fillText("T.C. Tarım ve Orman Bakanlığı · Tarımsal Araştırmalar ve Politikalar Genel Müdürlüğü", 80, 1436);
      return canvas;
    });
  }

  // Endemik seri: günün tarihine göre karıştırılmış sırada, n. kart n. türü alır (art arda aynı tür gelmez)
  function endemicFor(no, dateKey) {
    var E = (window.ENDEMICS || []).filter(function (e) { return window.PHOTOS && window.PHOTOS[e.key]; });
    if (!E.length) return null;
    var seed = 0; String(dateKey || "").split("").forEach(function (ch) { seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; });
    var order = E.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; var j = seed % (i + 1); var t = order[i]; order[i] = order[j]; order[j] = t; }
    return E[order[Math.max(0, (no || 1) - 1) % E.length]].key;
  }

  window.KasifCard = { draw: draw, tierFor: tierFor, pickPhoto: pickPhoto, endemicFor: endemicFor, TIERS: TIERS, W: W, H: H };
})();

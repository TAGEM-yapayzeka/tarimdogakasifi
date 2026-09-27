/* Ekran üstü Türkçe Q klavye (kiosk'ta fiziksel klavye yok). */
(function () {
  var ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
    ["Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç", "⌫"],
    ["BOŞLUK"]
  ];

  function mount(el, opts) {
    var value = "";
    var max = opts.maxLen || 12;
    el.innerHTML = ROWS.map(function (row) {
      return '<div class="kb-row">' + row.map(function (k) {
        var cls = k === "⌫" ? "kb-key kb-back" : k === "BOŞLUK" ? "kb-key kb-space" : "kb-key";
        return '<button type="button" class="' + cls + '" data-k="' + k + '">' + (k === "BOŞLUK" ? "boşluk" : k) + "</button>";
      }).join("") + "</div>";
    }).join("");

    el.onpointerdown = function (e) {
      var b = e.target.closest(".kb-key"); if (!b) return;
      e.preventDefault();
      b.classList.add("down"); setTimeout(function () { b.classList.remove("down"); }, 120);
      var k = b.getAttribute("data-k");
      // Sınıra gelince harf eklenmez ve uyarı gösterilir (onChange çağrılmaz, uyarı silinmesin)
      if (k !== "⌫" && value.length >= max) { opts.onLimit && opts.onLimit(); return; }
      if (k === "⌫") value = value.slice(0, -1);
      else if (k === "BOŞLUK") { if (value && value.slice(-1) !== " ") value += " "; }
      else value += k;
      opts.onChange && opts.onChange(value);
    };

    return {
      get: function () { return value; },
      clear: function () { value = ""; opts.onChange && opts.onChange(value); }
    };
  }

  /* "AYŞE NUR" -> "Ayşe Nur" (Türkçe I/İ kurallarıyla) */
  function titleCase(s) {
    return s.trim().split(/\s+/).map(function (w) {
      if (/^AMIN/.test(w)) w = "AMİ" + w.slice(3); // I tuşuyla yazılan Amin/Amine/Amina "Amın…" görünmesin
      return w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR");
    }).join(" ");
  }

  // Çocuklara yönelik ekranda uygunsuz ad girilmesini engelleyen filtre.
  // Ad sadeleştirilir (küçük harf, ı→i ş→s ç→c ğ→g ö→o ü→u). Her kelime ayrıca tekrar eden
  // harfleri tekilleştirilerek denetlenir (YARRAK→yarak). Tek harfli kelime dizileri birleştirilir
  // (A M K→amk). Kısa kökler kelime içinde ARANMAZ ("Işık"→"isik" temiz kalmalı); kelimeler arası
  // alt-dize araması yalnızca uzun ifadelerde yapılır ("Bayram Kaya", "Diyar Akın" temiz kalmalı).
  // Filtreden kaçan bir ad olursa yönetici panelinden tek tek silinebilir.
  var BAD_IN = ["amk", "amq", "amcik", "amcuk", "yarak", "yarag", "orospu", "orosbu", "orspu", "pezeven", "kahpe", "kahbe", "yavsak", "ibne", "ipne", "gavat", "tasak", "pust", "serefsiz", "gerizekali", "surtuk", "hitler", "pkk"];
  var BAD_START = ["sik", "skerim", "sktir", "got", "pic", "anani", "anasini", "feto"];
  var BAD_WORD = ["aq", "mk", "sk", "oc", "am", "bok", "salak", "aptal", "mal", "kasar", "apo", "deas", "isid", "akp", "chp", "mhp", "hdp"];
  var BAD_JOINED = ["aminakoy", "aminakoi", "aminakod", "orospu", "pezeven", "serefsiz", "gerizekali", "yavsak", "kahpe"];
  function fold(s) {
    return s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ç/g, "c")
      .replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
  }
  function squash(w) { return w.replace(/(.)\1+/g, "$1"); }
  function hit(t, inside) {
    return BAD_WORD.indexOf(t) >= 0 ||
      BAD_START.some(function (b) { return t.indexOf(b) === 0; }) ||
      inside.some(function (b) { return t.indexOf(b) >= 0; });
  }
  function isClean(name) {
    var words = fold(name).split(/\s+/).filter(Boolean), parts = [], run = "";
    words.forEach(function (w) { // "A M K" / "O Ç" -> "amk" / "oc"
      if (w.length === 1) { run += w; return; }
      if (run) parts.push(run);
      run = ""; parts.push(w);
    });
    if (run) parts.push(run);
    var joined = words.join("");
    return !parts.concat(parts.map(squash)).some(function (t) { return hit(t, BAD_IN); }) &&
      !hit(joined, BAD_JOINED) && !hit(squash(joined), BAD_JOINED);
  }

  /* Herkese açık tablo/şerit için: "Ayşe Nur Yılmaz" -> "Ayşe N." (soyadı gösterilmez) */
  function publicName(n) {
    var w = String(n).trim().split(/\s+/);
    return w.length > 1 ? w[0] + " " + w[1].charAt(0) + "." : w[0];
  }

  window.Keyboard = { mount: mount, titleCase: titleCase, isClean: isClean, publicName: publicName };
})();

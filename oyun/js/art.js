/* Çizimler: gerçek il sınırlarıyla Türkiye haritası (js/turkey-map.js) ve özel siluetler (elle çizilmiş SVG). */
(function () {
  // --- Türkiye haritası: turkey-map.js ile aynı Mercator izdüşümü ---
  var M = window.TR_MAP;
  function mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
  function P(lon, lat) {
    var p = M.proj;
    return [
      +(p.pad + (lon - p.lonMin) * Math.PI / 180 * p.sx).toFixed(1),
      +(p.pad + (mercY(p.latMax) - mercY(lat)) * p.sx).toFixed(1)
    ];
  }

  // Anahtarlar il kimlikleriyle aynıdır (turkey-map.js > provinces[].id). ll: il merkezinin boylam/enlemi.
  // lab: etiket yeri ("up" | "down" | "left" | "right"), komşu şehirlerle çakışmayı önlemek için.
  var CITIES = {
    istanbul: { name: "İstanbul", ll: [28.98, 41.01] },
    edirne: { name: "Edirne", ll: [26.56, 41.68] },
    ankara: { name: "Ankara", ll: [32.85, 39.93] },
    izmir: { name: "İzmir", ll: [27.14, 38.42] },
    aydin: { name: "Aydın", ll: [27.85, 37.85] },
    bursa: { name: "Bursa", ll: [29.06, 40.18] },
    antalya: { name: "Antalya", ll: [30.71, 36.89], lab: "down" },
    isparta: { name: "Isparta", ll: [30.55, 37.76] },
    konya: { name: "Konya", ll: [32.49, 37.87] },
    adana: { name: "Adana", ll: [35.32, 37.0], lab: "down" },
    kayseri: { name: "Kayseri", ll: [35.48, 38.72] },
    samsun: { name: "Samsun", ll: [36.33, 41.29] },
    giresun: { name: "Giresun", ll: [38.39, 40.91] },
    trabzon: { name: "Trabzon", ll: [39.72, 41.0] },
    rize: { name: "Rize", ll: [40.52, 41.02] },
    erzurum: { name: "Erzurum", ll: [41.27, 39.9] },
    malatya: { name: "Malatya", ll: [38.31, 38.35] },
    gaziantep: { name: "Gaziantep", ll: [37.38, 37.07], lab: "down" },
    sanliurfa: { name: "Şanlıurfa", ll: [38.79, 37.16], lab: "down" },
    diyarbakir: { name: "Diyarbakır", ll: [40.23, 37.91] },
    siirt: { name: "Siirt", ll: [41.94, 37.93] },
    van: { name: "Van", ll: [43.38, 38.49], lab: "right" }
  };
  Object.keys(CITIES).forEach(function (k) { CITIES[k].xy = P(CITIES[k].ll[0], CITIES[k].ll[1]); });

  var SEAS = [
    { t: "KARADENİZ", ll: [34.6, 42.45] },
    { t: "AKDENİZ", ll: [33.4, 35.72] },
    { t: "EGE DENİZİ", ll: [25.55, 38.35], rot: -90 }
  ];

  // İl yolları bir kez <defs> içine konur; dış kontur ve iller aynı yolları <use> ile paylaşır.
  var defsCache = null;
  function mapDefs() {
    if (defsCache) return defsCache;
    defsCache = M.provinces.map(function (p) { return '<path id="pv-' + p.id + '" d="' + p.d + '"/>'; }).join("");
    return defsCache;
  }

  function turkeyMap(cityKeys) {
    cityKeys = cityKeys || [];
    var labPos = { up: [0, -24, "middle"], down: [0, 40, "middle"], left: [-20, 7, "end"], right: [20, 7, "start"] };
    var marks = cityKeys.map(function (k) {
      var c = CITIES[k], x = c.xy[0], y = c.xy[1], lp = labPos[c.lab || "up"];
      return '<g class="city" data-city="' + k + '" transform="translate(' + x + ' ' + y + ')">' +
        '<circle class="city-halo" r="30"></circle><circle class="city-dot" r="11"></circle>' +
        '<text class="city-label" x="' + lp[0] + '" y="' + lp[1] + '" text-anchor="' + lp[2] + '">' + c.name + "</text></g>";
    }).join("");
    var outline = M.provinces.map(function (p) { return '<use href="#pv-' + p.id + '"/>'; }).join("");
    var provs = M.provinces.map(function (p) {
      var cand = cityKeys.indexOf(p.id) >= 0 ? " cand" : "";
      return '<use class="prov' + cand + '" data-prov="' + p.id + '" href="#pv-' + p.id + '"/>';
    }).join("");
    var lakes = M.lakes.map(function (l) { return '<path class="lake" d="' + l.d + '"/>'; }).join("");
    var seas = SEAS.map(function (s) {
      var q = P(s.ll[0], s.ll[1]);
      return '<text class="sea" x="' + q[0] + '" y="' + q[1] + '" text-anchor="middle"' + (s.rot ? ' transform="rotate(' + s.rot + " " + q[0] + " " + q[1] + ')"' : "") + ">" + s.t + "</text>";
    }).join("");
    return '<svg class="tr-map" viewBox="0 0 ' + M.w + " " + M.h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Türkiye haritası">' +
      "<defs>" + mapDefs() + "</defs>" +
      seas +
      '<g class="tr-outline">' + outline + "</g>" +
      '<g class="tr-provs">' + provs + "</g>" +
      '<g class="tr-lakes">' + lakes + "</g>" +
      marks + "</svg>";
  }

  // --- Özel siluetler (renkli çizim; siluet modunda CSS filtresiyle tek renge döner) ---
  var SVG = {
    kelaynak:
      '<svg viewBox="0 0 200 200"><g stroke-linecap="round">' +
      '<path d="M96 140 L90 186 M112 140 L118 186 M82 186 L98 186 M110 186 L126 186" stroke="#d64541" stroke-width="5" fill="none"/>' +
      '<path d="M62 118 C62 88 112 80 142 95 C166 108 172 126 188 152 C160 140 132 146 102 146 C80 146 62 138 62 118 Z" fill="#2b3a3a"/>' +
      '<path d="M100 98 C122 96 146 108 160 128" stroke="#3f6b5a" stroke-width="6" fill="none"/>' +
      '<path d="M66 112 L54 98 L64 96 L50 86 L62 82 L52 70 L66 72 L62 60 L80 74 L84 100 Z" fill="#23302f"/>' +
      '<circle cx="58" cy="56" r="14" fill="#d64541"/>' +
      '<path d="M47 52 Q18 60 10 98 Q24 68 50 62 Z" fill="#c0392b"/>' +
      '<circle cx="58" cy="52" r="3" fill="#1b1b1b"/></g></svg>',
    ceylan:
      '<svg viewBox="0 0 200 200"><g stroke-linecap="round">' +
      '<path d="M78 112 L73 180 M90 116 L94 180 M128 114 L124 180 M142 108 L148 180" stroke="#b87a3d" stroke-width="6" fill="none"/>' +
      '<ellipse cx="108" cy="100" rx="46" ry="22" fill="#d9a066"/>' +
      '<path d="M70 108 Q108 124 150 104 Q140 118 108 121 Q82 121 70 108 Z" fill="#f4ead8"/>' +
      '<path d="M64 98 L50 56 L64 50 L82 92 Z" fill="#d9a066"/>' +
      '<path d="M52 54 Q36 54 28 64 Q40 72 60 62 Z" fill="#c98f55"/>' +
      '<path d="M62 50 L72 40 L68 54 Z" fill="#c98f55"/>' +
      '<path d="M54 50 C48 34 62 26 56 10 M60 50 C58 34 72 28 66 12" stroke="#3b2a1a" stroke-width="4" fill="none"/>' +
      '<path d="M152 96 L162 108" stroke="#3b2a1a" stroke-width="5"/>' +
      '<circle cx="46" cy="58" r="2.6" fill="#1b1b1b"/></g></svg>',
    pamuk:
      '<svg viewBox="0 0 200 200">' +
      '<path d="M100 196 L100 150" stroke="#6b4a2b" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M100 150 L60 128 L78 150 L52 164 L100 158 L148 164 L122 150 L140 128 Z" fill="#7a5230"/>' +
      '<g fill="#ffffff"><circle cx="70" cy="100" r="30"/><circle cx="130" cy="100" r="30"/><circle cx="100" cy="68" r="32"/>' +
      '<circle cx="100" cy="112" r="30"/><circle cx="82" cy="70" r="20"/><circle cx="120" cy="72" r="20"/></g>' +
      '<g fill="none" stroke="#dfe6ee" stroke-width="3"><path d="M100 60 Q96 90 100 120"/><path d="M70 96 Q84 104 98 100"/><path d="M130 96 Q116 104 102 100"/></g></svg>',
    fistik:
      '<svg viewBox="0 0 200 200">' +
      '<path d="M100 30 C150 30 172 80 160 128 C150 168 118 180 100 180 C82 180 50 168 40 128 C28 80 50 30 100 30 Z" fill="#e8d3a8"/>' +
      '<path d="M100 44 C132 50 142 92 134 128 C126 156 112 166 100 166 C88 166 74 156 66 128 C58 92 68 50 100 44 Z" fill="#7b3f61"/>' +
      '<path d="M100 56 C124 64 128 96 122 126 C116 150 108 156 100 156 C92 156 84 150 78 126 C72 96 76 64 100 56 Z" fill="#8cc63f"/>' +
      '<path d="M100 60 L100 152" stroke="#6fa832" stroke-width="3"/></svg>',
    findik: // yeşil yapraksı zurufu içinde fındık
      '<svg viewBox="0 0 200 200">' +
      '<path d="M28 148 L18 116 L44 126 L40 96 L64 116 L70 146 C82 170 118 170 130 146 L136 116 L160 96 L156 126 L182 116 L172 148 C160 188 40 188 28 148 Z" fill="#7cb342" stroke="#4e7d24" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M100 26 C114 40 150 64 150 112 C150 148 128 168 100 168 C72 168 50 148 50 112 C50 64 86 40 100 26 Z" fill="#a8672f"/>' +
      '<path d="M78 70 C70 90 70 118 78 138" stroke="#c98a4b" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="156" rx="34" ry="12" fill="#e8d3a8"/>' +
      '<path d="M100 22 L94 38 L106 38 Z" fill="#6b4423"/></svg>',
    pati:
      '<svg viewBox="0 0 200 200"><g fill="#4a3322">' +
      '<path d="M100 104 C124 104 150 124 150 150 C150 174 128 180 118 172 C110 166 90 166 82 172 C72 180 50 174 50 150 C50 124 76 104 100 104 Z"/>' +
      '<ellipse cx="54" cy="96" rx="15" ry="20" transform="rotate(-20 54 96)"/><ellipse cx="82" cy="62" rx="15" ry="21" transform="rotate(-6 82 62)"/>' +
      '<ellipse cx="118" cy="62" rx="15" ry="21" transform="rotate(6 118 62)"/><ellipse cx="146" cy="96" rx="15" ry="20" transform="rotate(20 146 96)"/></g></svg>',
    bugday:
      '<svg viewBox="0 0 200 200"><g fill="#e5b842" stroke="#b8862a" stroke-width="2">' +
      '<path d="M100 196 L100 40" stroke="#b8862a" stroke-width="5" fill="none"/>' +
      '<ellipse cx="86" cy="60" rx="10" ry="18" transform="rotate(-30 86 60)"/><ellipse cx="114" cy="60" rx="10" ry="18" transform="rotate(30 114 60)"/>' +
      '<ellipse cx="86" cy="88" rx="10" ry="18" transform="rotate(-30 86 88)"/><ellipse cx="114" cy="88" rx="10" ry="18" transform="rotate(30 114 88)"/>' +
      '<ellipse cx="86" cy="116" rx="10" ry="18" transform="rotate(-30 86 116)"/><ellipse cx="114" cy="116" rx="10" ry="18" transform="rotate(30 114 116)"/>' +
      '<ellipse cx="100" cy="36" rx="9" ry="17"/>' +
      '<path d="M80 50 L66 14 M120 50 L134 14 M100 22 L100 2" fill="none" stroke-width="2"/></g></svg>'
  };

  /* Bir "görsel" tanımını HTML'e çevirir: "svg:kelaynak" ya da emoji dizesi */
  function art(spec, cls, photoKey) {
    cls = cls || "";
    var ph = photoKey && window.PHOTOS && window.PHOTOS[photoKey];
    if (ph) return '<span class="art art-photo ' + cls + '"><img src="' + ph.src + '" alt="" draggable="false"></span>';
    if (spec && spec.indexOf("svg:") === 0) return '<span class="art art-svg ' + cls + '">' + SVG[spec.slice(4)] + "</span>";
    if (spec && spec.indexOf("dark:") === 0) return '<span class="art art-emoji art-dark ' + cls + '">' + spec.slice(5) + "</span>";
    return '<span class="art art-emoji ' + cls + '">' + (spec || "") + "</span>";
  }

  // Küçük çizgi ikonlar (etiketlerde emoji yerine)
  var ICON_PATHS = {
    choice: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    truefalse: '<path d="M3 12.5l3 3 5-6.5M14 9l6 6M20 9l-6 6"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
    silhouette: '<path d="M12 12.5c-3 0-5.5 2.8-5.5 5 0 1.6 1.5 2.5 3 2.1 1.6-.4 3.4-.4 5 0 1.5.4 3-.5 3-2.1 0-2.2-2.5-5-5.5-5z"/><circle cx="5.5" cy="10" r="1.8"/><circle cx="9.3" cy="5.8" r="1.8"/><circle cx="14.7" cy="5.8" r="1.8"/><circle cx="18.5" cy="10" r="1.8"/>',
    map: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.2"/>',
    tarim: '<path d="M12 21V7M12 10c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zm0 5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 7V3"/>',
    doga: '<path d="M5 19c0-8.5 6-14 15-14 0 9-6 15-14.5 15"/><path d="M5 19l8-8"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8M12 13v4M8.5 20h7M10 17h4v3h-4z"/>'
  };
  function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[name] + "</svg>";
  }

  function photo(key) { return (key && window.PHOTOS && window.PHOTOS[key]) || null; }

  window.ART = { turkeyMap: turkeyMap, CITIES: CITIES, SVG: SVG, art: art, photo: photo, icon: icon, mapCredit: M.credit };
})();

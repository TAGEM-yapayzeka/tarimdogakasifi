/* Tarım & Doğa Kâşifi web sürümü: çevrimdışı önbellek. Önbellek adı sürümle değişir; eski önbellekler silinir. */
var CACHE = "kasif-oyun-3.4";
var FILES = ["./", "index.html", "css/style.css", "js/config.js", "js/vendor/qrcode.js", "js/turkey-map.js", "js/photos.js", "js/endemics.js", "js/card.js", "js/art.js", "js/sfx.js", "js/keyboard.js", "js/questions.js", "js/app.js", "assets/fonts/mulish-latin-500-normal.woff2", "assets/fonts/mulish-latin-800-normal.woff2", "assets/fonts/mulish-latin-ext-500-normal.woff2", "assets/fonts/mulish-latin-ext-800-normal.woff2", "assets/fonts/poppins-latin-600-normal.woff2", "assets/fonts/poppins-latin-800-normal.woff2", "assets/fonts/poppins-latin-ext-600-normal.woff2", "assets/fonts/poppins-latin-ext-800-normal.woff2", "assets/logos/bakanlik.png", "assets/logos/milli-teknoloji-hamlesi-renkli.png", "assets/logos/milli-teknoloji-hamlesi.png", "assets/logos/tagem.png", "assets/logos/teknofest.png", "assets/photos/anadolu-parsi.jpg", "assets/photos/antep-fistigi.jpg", "assets/photos/bal-arisi.jpg", "assets/photos/bal.jpg", "assets/photos/baykus.jpg", "assets/photos/bozayi.jpg", "assets/photos/bugday.jpg", "assets/photos/cay.jpg", "assets/photos/ceylan.jpg", "assets/photos/circir-bocegi.jpg", "assets/photos/cita.jpg", "assets/photos/damla-sulama.jpg", "assets/photos/e-akdenizmelikesi.jpg", "assets/photos/e-ana-kurtkulagi.jpg", "assets/photos/e-anadolucillisi.jpg", "assets/photos/e-anadoluengeregi.jpg", "assets/photos/e-ankaracigdemi.jpg", "assets/photos/e-beldibisemenderi.jpg", "assets/photos/e-buyukmercan.jpg", "assets/photos/e-damalilale.jpg", "assets/photos/e-fethiyesumbulu.jpg", "assets/photos/e-goknavruz.jpg", "assets/photos/e-guzelmavi.jpg", "assets/photos/e-harrankeleri.jpg", "assets/photos/e-hasgentiyan.jpg", "assets/photos/e-incikefali.jpg", "assets/photos/e-kartaldagi-cigdemi.jpg", "assets/photos/e-kasnak-mesesi.jpg", "assets/photos/e-kayabegendi.jpg", "assets/photos/e-kazdagi-goknari.jpg", "assets/photos/e-kesisbasi.jpg", "assets/photos/e-kirpikli-zambak.jpg", "assets/photos/e-kostukopegi.jpg", "assets/photos/e-likyasemenderi.jpg", "assets/photos/e-mardincigdemi.jpg", "assets/photos/e-mardinsogani.jpg", "assets/photos/e-pamfilyakertenkele.jpg", "assets/photos/e-pirpizek.jpg", "assets/photos/e-puslusalba.jpg", "assets/photos/e-saimbeylimavisi.jpg", "assets/photos/e-sarinavruz.jpg", "assets/photos/e-secmenkantaronu.jpg", "assets/photos/e-seritlisemender.jpg", "assets/photos/e-seytankabalagi.jpg", "assets/photos/e-tombulcekirge.jpg", "assets/photos/e-torosyersincabi.jpg", "assets/photos/e-yabankoyunu.jpg", "assets/photos/e-yanardoner.jpg", "assets/photos/e-yitiklale.jpg", "assets/photos/elma.jpg", "assets/photos/filiz.jpg", "assets/photos/findik.jpg", "assets/photos/firat-kaplumbagasi.jpg", "assets/photos/guguk-kusu.jpg", "assets/photos/guvercin.jpg", "assets/photos/havuc.jpg", "assets/photos/horoz.jpg", "assets/photos/inci-kefali.jpg", "assets/photos/isot.jpg", "assets/photos/karasinek.jpg", "assets/photos/kayisi.jpg", "assets/photos/kedi.jpg", "assets/photos/kelaynak.jpg", "assets/photos/kelebek.jpg", "assets/photos/kiraz.jpg", "assets/photos/kizil-tilki.jpg", "assets/photos/kurbaga.jpg", "assets/photos/misir.jpg", "assets/photos/pamuk.jpg", "assets/photos/papagan.jpg", "assets/photos/patates.jpg", "assets/photos/penguen.jpg", "assets/photos/puma.jpg", "assets/photos/sivrisinek.jpg", "assets/photos/siyez.jpg", "assets/photos/solucan.jpg", "assets/photos/sut.jpg", "assets/photos/tiftik-kecisi.jpg", "assets/photos/ugur-bocegi.jpg", "assets/photos/yag-gulu.jpg", "assets/photos/yerel-tohum.jpg", "assets/photos/yumurta.jpg", "assets/svg/landscape-port.svg", "assets/svg/landscape.svg"];
self.addEventListener("install", function (e) {
  // Dosyalar tek tek önbelleğe alınır: biri gelmezse kurulum yine tamamlanır, eksik dosya ilk kullanımda eklenir
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("kasif-oyun-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Önce önbellek (hızlı ve internetsiz çalışır), yoksa ağ; ağdan gelen de önbelleğe eklenir
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});

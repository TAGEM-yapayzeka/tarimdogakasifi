/* Kiosk ayarları – stant ekibi yalnızca bu dosyayı düzenleyerek oyunu uyarlayabilir. */
window.CONFIG = {
  QUESTIONS_PER_GAME: 5,

  // Yaşa göre zorluk seviyeleri: oyuncunun yaşı seviyeyi, seviye de soru süresini belirler.
  // (Sorular js/questions.js içinde "lv" alanıyla bu seviyelere ayrılmıştır.)
  LEVELS: {
    1: { maxAge: 8, seconds: 20, label: "7–8 yaş" },
    2: { maxAge: 10, seconds: 18, label: "9–10 yaş" },
    3: { maxAge: 13, seconds: 15, label: "11–13 yaş" },
    4: { maxAge: 99, seconds: 15, label: "14 yaş ve üstü" }
  },
  // Yaş seçim ekranındaki düğmeler (6 = "6 ve altı", 18 = "18 ve üstü")
  AGES: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],

  // Her oyunda kaç soru oyuncunun kendi yaş seviyesinden gelsin (kalanı bir alt/üst seviyeden; çeşitlilik için)
  OWN_LEVEL_PER_GAME: 3,

  // Puan: doğru cevap = BASE + kalan süreye orantılı en fazla TIME_BONUS
  BASE_POINTS: 100,
  TIME_BONUS: 100,

  // Geri bildirim kartı: "Sıradaki soru"ya basılmazsa bu süre sonunda kendiliğinden geçer (ms).
  // Süre = bakma payı + (bilgi metni + doğru cevap) × okuma hızı; en az / en çok sınırlı.
  FEEDBACK_MS_CORRECT: 5000,   // doğru cevapta en az
  FEEDBACK_MS_WRONG: 7000,     // yanlış cevapta en az (doğru cevap da okunur)
  FEEDBACK_MS_BASE: 2500,      // sonuca ve fotoğrafa bakma payı
  // Okuma hızı, karakter başına ms (çocuklar yetişkinlerden yavaş okur)
  FEEDBACK_MS_PER_CHAR_KUCUK: 110, // 8 yaş ve altı
  FEEDBACK_MS_PER_CHAR_MINIK: 90,  // 9–11 yaş
  FEEDBACK_MS_PER_CHAR: 65,        // 12 yaş ve üstü
  FEEDBACK_MS_MAX: 24000,

  // Dokunma olmazsa karşılama ekranına dönüş (ms)
  IDLE_MS: 20000,
  IDLE_MS_RESULT: 45000,
  // Üst üste bu kadar soru dokunulmadan süresi dolarsa oyun terk edilmiş sayılır
  ABANDON_AFTER_TIMEOUTS: 2,

  NAME_MAX_LEN: 24, // ad + soyad (kartta ve katılım belgesinde tam ad; herkese açık tabloda "Ad S.")
  LEADERBOARD_SIZE: 10,

  // Rozet sayfasının yayınlandığı adres (sonunda / olmalı). README > "Rozet sayfasını yayınlama".
  // Örn: "https://kullaniciadi.github.io/teknofest-rozet/"
  BADGE_BASE_URL: "https://tagem-yapayzeka.github.io/tarimdogakasifi/",

  // Gizli yönetici paneli: sol üst köşeye 3 sn basılı tutun. 3 hatalı denemede 1 dk kilitlenir.
  // PIN'i etkinlikten önce değiştirin (tarih/sıra olmasın) ve yalnızca stant ekibine söyleyin.
  ADMIN_PIN: "735194",

  EVENT_NAME: "TEKNOFEST Güneydoğu 2026",
  EVENT_PLACE: "Şanlıurfa",
  BADGE_SUBTITLE: "Şanlıurfa TEKNOFEST Tarım ve Doğa Koruyucusu",

  TITLES: [
    // min doğru sayısı → unvan
    { min: 5, name: "Usta Doğa Muhafızı", icon: "🏆" },
    { min: 3, name: "Gönüllü Kâşif", icon: "🌱" },
    { min: 1, name: "Doğa Dostu", icon: "🔍" },
    { min: 0, name: "Doğa Çırağı", icon: "🌰" }
  ]
};

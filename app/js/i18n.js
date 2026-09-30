// Two languages, one flat dictionary each. t(key, vars) does {name} substitution.
const tr = {
  'app.name': 'Focus Timer',
  'app.tagline': 'Pomodoro ve daha fazlası: verimlilik zamanlayıcıları, tek sayfada, çevrimdışı.',

  'preset.pomodoro': 'Pomodoro',
  'preset.pomodoro.desc': '25 dk odak, 5 dk mola; her 4 turda 15 dk uzun mola. Francesco Cirillo, 1980\'ler.',
  'preset.fiftytwo': '52/17',
  'preset.fiftytwo.desc': '52 dk odak, 17 dk mola. DeskTime\'ın en verimli %10\'luk kullanıcı verisinden.',
  'preset.ultradian': '90/20',
  'preset.ultradian.desc': '90 dk derin iş, 20 dk mola. Kleitman\'ın ultradian uyanıklık döngüsüne dayanır.',
  'preset.animedoro': 'Animedoro',
  'preset.animedoro.desc': '60 dk odak, 20 dk mola: bir bölüm dizi kadar. Ödül odaklı.',
  'preset.flowtime': 'Flowtime',
  'preset.flowtime.desc': 'Zamanlayıcı yok: akış bozulunca durdur, mola odağın 1/5\'i kadar olur.',
  'preset.thirdtime': 'Third Time',
  'preset.thirdtime.desc': 'Flowtime gibi, ama mola odağın 1/3\'ü. Uzun günler için.',
  'preset.eyes': '20-20-20',
  'preset.eyes.desc': 'Her 20 dakikada 20 saniye 20 adım uzağa bak. Göz yorgunluğuna karşı.',
  'preset.timebox': 'Zaman Kutusu',
  'preset.timebox.desc': 'Tek görev, tek süre. Bitti mi bitti.',
  'preset.stopwatch': 'Kronometre',
  'preset.stopwatch.desc': 'Bir işin gerçekte ne kadar sürdüğünü ölç.',
  'preset.tabata': 'Tabata',
  'preset.tabata.desc': '20 sn yükleme, 10 sn dinlenme, 8 tur. Egzersiz ve esneme için.',
  'preset.custom': 'Özel',
  'preset.custom.desc': 'Kendi döngünü kur.',

  'phase.focus': 'Odak',
  'phase.short': 'Mola',
  'phase.long': 'Uzun mola',
  'phase.work': 'Yükleme',
  'phase.rest': 'Dinlenme',
  'phase.prep': 'Hazırlan',
  'phase.screen': 'Ekran',
  'phase.look': 'Uzağa bak',
  'phase.done': 'Tamamlandı',

  'btn.start': 'Başlat',
  'btn.pause': 'Duraklat',
  'btn.resume': 'Devam',
  'btn.skip': 'Geç',
  'btn.finish': 'Bitir',
  'btn.reset': 'Sıfırla',
  'btn.again': 'Yeniden',
  'btn.settings': 'Ayarlar',
  'btn.stats': 'İstatistik',
  'btn.close': 'Kapat',
  'btn.test': 'Dene',
  'btn.defaults': 'Varsayılanlara dön',
  'btn.export': 'Günlüğü dışa aktar',
  'btn.clear': 'Günlüğü sil',
  'confirm.clear': 'Tüm oturum günlüğü silinsin mi?',

  'round.of': 'Tur {n} / {total}',
  'round.n': 'Tur {n}',
  'today.summary': 'Bugün {sessions} oturum · {time}',
  'today.goal': 'Hedef {done}/{goal}',
  'streak': '{n} günlük seri',
  'elapsed': 'Geçen',
  'nextUp': 'Sıradaki: {phase}',
  'hint.space': 'Boşluk: başlat / duraklat · N: geç · R: sıfırla · 1–9: teknik seç',
  'hint.flow': 'Odak bozulunca "Bitir"e bas; mola süresi ona göre hesaplanır.',

  'settings.title': 'Ayarlar',
  'settings.preset': 'Bu teknik',
  'settings.general': 'Genel',
  'settings.data': 'Veri',
  'f.focus': 'Odak süresi',
  'f.short': 'Mola süresi',
  'f.long': 'Uzun mola süresi',
  'f.longEvery': 'Uzun mola sıklığı (tur)',
  'f.rounds': 'Tur sayısı (0 = sınırsız)',
  'f.ratio': 'Mola oranı (odak ÷ n)',
  'f.minBreak': 'En kısa mola',
  'f.maxBreak': 'En uzun mola',
  'f.prep': 'Hazırlık',
  'f.work': 'Yükleme süresi',
  'f.rest': 'Dinlenme süresi',
  'unit.min': 'dk',
  'unit.sec': 'sn',
  'unit.count': '',
  'unit.ratio': '',
  's.autoBreak': 'Molaları otomatik başlat',
  's.autoFocus': 'Odağı otomatik başlat',
  's.sound': 'Ses',
  's.volume': 'Ses düzeyi',
  's.tick': 'Tik sesi',
  's.notify': 'Masaüstü bildirimi',
  's.notify.denied': 'Tarayıcı bildirim iznini reddetti.',
  's.title': 'Sekme başlığında geri sayım',
  's.goal': 'Günlük hedef (oturum)',
  's.theme': 'Tema',
  's.theme.auto': 'Sistem',
  's.theme.dark': 'Koyu',
  's.theme.light': 'Açık',
  's.lang': 'Dil',
  's.wake': 'Çalışırken ekranı açık tut',

  'stats.title': 'İstatistik',
  'stats.today': 'Bugün',
  'stats.week': 'Son 7 gün',
  'stats.total': 'Toplam',
  'stats.sessions': 'oturum',
  'stats.empty': 'Henüz tamamlanan oturum yok. İlk odağı başlat.',
  'weekday.0': 'Pz', 'weekday.1': 'Pt', 'weekday.2': 'Sa', 'weekday.3': 'Ça', 'weekday.4': 'Pe', 'weekday.5': 'Cu', 'weekday.6': 'Ct',

  'notif.focusEnd': 'Odak bitti. Mola zamanı: {next}.',
  'notif.breakEnd': 'Mola bitti. Odağa dön.',
  'notif.done': 'Hepsi tamam. Tebrikler!',
  'notif.look': '20 saniye uzağa bak.',

  'install': 'Uygulama olarak kur',
  'offline': 'Çevrimdışı çalışır',
};

const en = {
  'app.name': 'Focus Timer',
  'app.tagline': 'Pomodoro and beyond: productivity timers on one page, offline.',

  'preset.pomodoro': 'Pomodoro',
  'preset.pomodoro.desc': '25 min focus, 5 min break; a 15 min long break every 4 rounds. Francesco Cirillo, 1980s.',
  'preset.fiftytwo': '52/17',
  'preset.fiftytwo.desc': '52 min focus, 17 min break. From DeskTime\'s data on its most productive 10% of users.',
  'preset.ultradian': '90/20',
  'preset.ultradian.desc': '90 min deep work, 20 min break. Based on Kleitman\'s ultradian alertness cycle.',
  'preset.animedoro': 'Animedoro',
  'preset.animedoro.desc': '60 min focus, 20 min break: one episode long. Reward-driven.',
  'preset.flowtime': 'Flowtime',
  'preset.flowtime.desc': 'No timer: stop when focus breaks, then rest for 1/5 of the focus time.',
  'preset.thirdtime': 'Third Time',
  'preset.thirdtime.desc': 'Like Flowtime, but the break is 1/3 of the focus time. For long days.',
  'preset.eyes': '20-20-20',
  'preset.eyes.desc': 'Every 20 minutes look 20 feet away for 20 seconds. Against eye strain.',
  'preset.timebox': 'Timebox',
  'preset.timebox.desc': 'One task, one block of time. When it is over, it is over.',
  'preset.stopwatch': 'Stopwatch',
  'preset.stopwatch.desc': 'Measure how long something really takes.',
  'preset.tabata': 'Tabata',
  'preset.tabata.desc': '20 s work, 10 s rest, 8 rounds. For exercise and stretching.',
  'preset.custom': 'Custom',
  'preset.custom.desc': 'Build your own cycle.',

  'phase.focus': 'Focus',
  'phase.short': 'Break',
  'phase.long': 'Long break',
  'phase.work': 'Work',
  'phase.rest': 'Rest',
  'phase.prep': 'Get ready',
  'phase.screen': 'Screen',
  'phase.look': 'Look away',
  'phase.done': 'Done',

  'btn.start': 'Start',
  'btn.pause': 'Pause',
  'btn.resume': 'Resume',
  'btn.skip': 'Skip',
  'btn.finish': 'Finish',
  'btn.reset': 'Reset',
  'btn.again': 'Again',
  'btn.settings': 'Settings',
  'btn.stats': 'Stats',
  'btn.close': 'Close',
  'btn.test': 'Test',
  'btn.defaults': 'Reset to defaults',
  'btn.export': 'Export log',
  'btn.clear': 'Clear log',
  'confirm.clear': 'Delete the whole session log?',

  'round.of': 'Round {n} / {total}',
  'round.n': 'Round {n}',
  'today.summary': 'Today {sessions} sessions · {time}',
  'today.goal': 'Goal {done}/{goal}',
  'streak': '{n}-day streak',
  'elapsed': 'Elapsed',
  'nextUp': 'Next: {phase}',
  'hint.space': 'Space: start / pause · N: skip · R: reset · 1–9: pick a technique',
  'hint.flow': 'Press "Finish" when your focus breaks; the break is sized from it.',

  'settings.title': 'Settings',
  'settings.preset': 'This technique',
  'settings.general': 'General',
  'settings.data': 'Data',
  'f.focus': 'Focus length',
  'f.short': 'Break length',
  'f.long': 'Long break length',
  'f.longEvery': 'Long break every (rounds)',
  'f.rounds': 'Rounds (0 = unlimited)',
  'f.ratio': 'Break ratio (focus ÷ n)',
  'f.minBreak': 'Shortest break',
  'f.maxBreak': 'Longest break',
  'f.prep': 'Preparation',
  'f.work': 'Work length',
  'f.rest': 'Rest length',
  'unit.min': 'min',
  'unit.sec': 's',
  'unit.count': '',
  'unit.ratio': '',
  's.autoBreak': 'Auto-start breaks',
  's.autoFocus': 'Auto-start focus',
  's.sound': 'Sound',
  's.volume': 'Volume',
  's.tick': 'Ticking sound',
  's.notify': 'Desktop notification',
  's.notify.denied': 'The browser denied notification permission.',
  's.title': 'Countdown in the tab title',
  's.goal': 'Daily goal (sessions)',
  's.theme': 'Theme',
  's.theme.auto': 'System',
  's.theme.dark': 'Dark',
  's.theme.light': 'Light',
  's.lang': 'Language',
  's.wake': 'Keep the screen awake while running',

  'stats.title': 'Statistics',
  'stats.today': 'Today',
  'stats.week': 'Last 7 days',
  'stats.total': 'Total',
  'stats.sessions': 'sessions',
  'stats.empty': 'No completed sessions yet. Start your first focus.',
  'weekday.0': 'Su', 'weekday.1': 'Mo', 'weekday.2': 'Tu', 'weekday.3': 'We', 'weekday.4': 'Th', 'weekday.5': 'Fr', 'weekday.6': 'Sa',

  'notif.focusEnd': 'Focus is over. Break time: {next}.',
  'notif.breakEnd': 'Break is over. Back to focus.',
  'notif.done': 'All done. Well played!',
  'notif.look': 'Look away for 20 seconds.',

  'install': 'Install as an app',
  'offline': 'Works offline',
};

export const DICTS = { tr, en };
export const LANGS = ['en', 'tr'];

let current = 'en';

export function setLang(l) {
  current = DICTS[l] ? l : 'en';
  document.documentElement.lang = current;
}

export function getLang() {
  return current;
}

export function detectLang() {
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return DICTS[nav] ? nav : 'en';
}

export function t(key, vars) {
  let s = DICTS[current][key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// Every key in one language must exist in the other; the unit test checks this.
export function missingKeys() {
  const out = [];
  for (const k of Object.keys(en)) if (!(k in tr)) out.push(`tr:${k}`);
  for (const k of Object.keys(tr)) if (!(k in en)) out.push(`en:${k}`);
  return out;
}

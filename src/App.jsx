import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Bell, Volume2, Play, Pause, Settings, Compass,
  Headphones, Sun, X, ChevronRight, Loader2, Check,
  PlayCircle, StopCircle, Zap,
} from 'lucide-react';

/* ============================================================
   DATA — verified prayer information, duas, and audio sources
   Sources: Sahih al-Bukhari, Sahih Muslim, Sunan Abu Dawud,
   Hisn al-Muslim (Fortress of the Muslim), Quran.com
   ============================================================ */

const PRAYERS = {
  Fajr: {
    arabic: 'الفجر', translit: 'Al-Fajr', meaning: 'The Dawn',
    fard: 2, sunnah: 2, nafl: 0,
    totalDescription: '2 Sunnah (before) + 2 Fard',
    window: 'From true dawn until sunrise',
    description:
      'The dawn prayer, offered between the break of true dawn and sunrise. The Prophet ﷺ said its two Sunnah rakats are "better than the world and all it contains" (Sahih Muslim 725). The adhan for Fajr uniquely includes "As-salatu khayrun minan-nawm" — prayer is better than sleep.',
    history:
      'Fajr was among the earliest prayers established in Mecca. Its quiet, reflective nature is echoed in the long recitations traditionally read aloud during it. Scholars note it marks the soul\'s return to remembrance at the day\'s first light.',
  },
  Dhuhr: {
    arabic: 'الظهر', translit: 'Adh-Dhuhr', meaning: 'The Noon',
    fard: 4, sunnah: 4, nafl: 2,
    totalDescription: '4 Sunnah (before) + 4 Fard + 2 Sunnah (after)',
    window: 'From the sun\'s zenith until Asr begins',
    description:
      'The midday prayer, performed after the sun passes its zenith. On Fridays, Jumu\'ah replaces Dhuhr with a two-rakat congregational prayer preceded by a khutbah (sermon).',
    history:
      'Established during the Isra and Mi\'raj (the Night Journey), when the five daily prayers were ordained. The four Sunnah before Dhuhr were a consistent practice of the Prophet ﷺ (Sahih al-Bukhari 1182).',
  },
  Asr: {
    arabic: 'العصر', translit: 'Al-Asr', meaning: 'The Afternoon',
    fard: 4, sunnah: 0, nafl: 4,
    totalDescription: '4 Fard (4 Nafl before are optional and recommended)',
    window: 'From mid-afternoon until sunset begins',
    description:
      'The afternoon prayer. The Prophet ﷺ said: "Whoever misses Asr, it is as if he has lost his family and property" (Sahih al-Bukhari 552). It is the "middle prayer" Allah commands us to guard (Quran 2:238 — according to the majority of scholars).',
    history:
      'Its timing distinguishes between the Shafi/Maliki/Hanbali and Hanafi schools — the Hanafi school defines Asr\'s start later (when an object\'s shadow is twice its own length), reflecting longstanding jurisprudential tradition.',
  },
  Maghrib: {
    arabic: 'المغرب', translit: 'Al-Maghrib', meaning: 'The Sunset',
    fard: 3, sunnah: 2, nafl: 2,
    totalDescription: '3 Fard + 2 Sunnah (after) + 2 Nafl (optional)',
    window: 'From sunset until the disappearance of red twilight',
    description:
      'The sunset prayer — the only obligatory prayer with three rakats. It begins immediately after the sun fully sets and has a relatively short window, which is why breaking fast in Ramadan is tied to this time.',
    history:
      'The Prophet ﷺ would hasten to pray Maghrib as soon as the sun set. Uqba ibn Amir narrates: "My Ummah will remain in goodness as long as they do not delay Maghrib until the stars appear" (Sunan Abu Dawud 418).',
  },
  Isha: {
    arabic: 'العشاء', translit: 'Al-Isha', meaning: 'The Night',
    fard: 4, sunnah: 2, nafl: 3,
    totalDescription: '4 Fard + 2 Sunnah + 3 Witr (highly emphasized)',
    window: 'From the end of twilight until before Fajr',
    description:
      'The night prayer, followed by the Witr prayer (1 or 3 odd-numbered rakats) which closes the day\'s worship. The Prophet ﷺ said: "Whoever prays Isha in congregation, it is as if he has stood in prayer half the night" (Sahih Muslim 656).',
    history:
      'Witr after Isha was so emphasized by the Prophet ﷺ that some scholars (Hanafi) consider it wajib (necessary). It is the last voluntary act before sleep and traditionally includes the Qunut supplication.',
  },
};

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const ADHAN_LIBRARY = [
  { name: 'Makkah — Ali Ahmad Mulla', url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  { name: 'Madinah — Essam Bukhari', url: 'https://www.islamcan.com/audio/adhan/azan3.mp3' },
  { name: 'Classical Egyptian', url: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
  { name: 'Turkish Maqam', url: 'https://www.islamcan.com/audio/adhan/azan5.mp3' },
  { name: 'Yusuf Islam', url: 'https://www.islamcan.com/audio/adhan/azan6.mp3' },
  { name: 'Mishary Rashid Alafasy', url: 'https://www.islamcan.com/audio/adhan/azan9.mp3' },
  { name: 'Fajr — With "prayer is better than sleep"', url: 'https://www.islamcan.com/audio/adhan/azan1.mp3', fajrOnly: true },
];

const RECITERS = [
  { id: 'alafasy', name: 'Mishary Rashid Alafasy', fullFatiha: 'https://server8.mp3quran.net/afs/001.mp3' },
  { id: 'sudais', name: 'Abdul Rahman Al-Sudais', fullFatiha: 'https://server11.mp3quran.net/sds/001.mp3' },
  { id: 'shuraim', name: 'Saud Al-Shuraim', fullFatiha: 'https://server7.mp3quran.net/shur/001.mp3' },
  { id: 'ghamdi', name: 'Saad Al-Ghamdi', fullFatiha: 'https://server7.mp3quran.net/s_gmd/001.mp3' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', fullFatiha: 'https://server13.mp3quran.net/husr/001.mp3' },
  { id: 'minshawi', name: 'Mohamed Siddiq Al-Minshawi', fullFatiha: 'https://server10.mp3quran.net/minsh/001.mp3' },
];

const MOOD_DUAS = {
  stressed: {
    emoji: '😰', label: 'Stressed',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    translit: 'Hasbiyallahu la ilaha illa huwa, \'alayhi tawakkaltu wa huwa rabbul-\'arshil-\'azeem',
    translation: '"Allah is sufficient for me. There is no deity except Him. Upon Him I have relied, and He is the Lord of the Great Throne."',
    source: 'Quran 9:129 — Recited 7 times morning and evening (Sunan Abu Dawud 5081)',
    context: 'The Prophet ﷺ taught that whoever says this 7 times, Allah will be sufficient for him in what concerns him of the matters of this world and the Hereafter.',
  },
  anxious: {
    emoji: '😟', label: 'Anxious / Worried',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
    translit: 'Allahumma inni a\'udhu bika minal-hammi wal-hazan, wal-\'ajzi wal-kasal, wal-bukhli wal-jubn, wa dala\'id-dayni wa ghalabatir-rijal',
    translation: '"O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice, the burden of debts and being overpowered by men."',
    source: 'Sahih al-Bukhari 2893',
    context: 'The Prophet ﷺ taught this to Abu Umamah when he was sitting in the mosque consumed by worry and debt. Abu Umamah said: "I did that, and Allah removed my distress and settled my debt."',
  },
  sad: {
    emoji: '😢', label: 'Sad',
    arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ... أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي',
    translit: '...an taj\'alal-Qur\'ana rabee\'a qalbi, wa noora sadri, wa jala\'a huzni, wa dhahaba hammi',
    translation: '"...make the Quran the spring of my heart, the light of my chest, the departure of my sadness, and the release of my anxiety."',
    source: 'Musnad Ahmad 3712 — graded authentic by Ibn al-Qayyim',
    context: 'The Prophet ﷺ said: "No one ever says this when afflicted with distress or grief except that Allah removes his distress and replaces it with joy."',
  },
  angry: {
    emoji: '😤', label: 'Angry',
    arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    translit: 'A\'udhu billahi minash-shaytanir-rajeem',
    translation: '"I seek refuge in Allah from Satan, the accursed."',
    source: 'Sahih al-Bukhari 3282',
    context: 'Two men were arguing in front of the Prophet ﷺ and one became red with anger. The Prophet ﷺ said: "I know a word which, if he said it, would remove his anger: A\'udhu billahi minash-shaytanir-rajeem." He also recommended sitting if standing, lying down if sitting, and performing wudu.',
  },
  happy: {
    emoji: '😊', label: 'Happy / Grateful',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
    translit: 'Alhamdu lillahil-ladhi bi-ni\'matihi tatimmus-salihat',
    translation: '"All praise is for Allah, by whose grace righteous works are accomplished."',
    source: 'Sunan Ibn Majah 3803',
    context: 'The Prophet ﷺ, when something pleased him, would say this. A dua of pure joy and acknowledgment that every good thing is completed only through Allah\'s favor.',
  },
  thankful: {
    emoji: '🙏', label: 'Thankful',
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    translit: 'Allahumma a\'inni \'ala dhikrika wa shukrika wa husni \'ibadatik',
    translation: '"O Allah, help me to remember You, thank You, and worship You in the best manner."',
    source: 'Sunan Abu Dawud 1522',
    context: 'The Prophet ﷺ took Mu\'adh ibn Jabal by the hand and said: "O Mu\'adh, by Allah I love you," and then instructed him to never leave reciting this after every prayer.',
  },
  unhealthy: {
    emoji: '🤒', label: 'Unwell / Seeking healing',
    arabic: 'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
    translit: 'Allahumma rabban-nas, adhhibil-ba\'s, ishfi antash-shafi, la shifa\'a illa shifa\'uk, shifa\'an la yughadiru saqama',
    translation: '"O Allah, Lord of mankind, remove the harm. Heal, for You are the Healer. There is no cure except Your cure — a cure that leaves no illness behind."',
    source: 'Sahih al-Bukhari 5675',
    context: 'The Prophet ﷺ would place his right hand on the person suffering and recite this supplication. A foundational dua for healing, taught to Aisha (RA).',
  },
  fearful: {
    emoji: '😨', label: 'Afraid',
    arabic: 'اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ، وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ',
    translit: 'Allahumma inna naj\'aluka fi nuhurihim, wa na\'udhu bika min shururihim',
    translation: '"O Allah, we place You before them and seek refuge in You from their evils."',
    source: 'Sunan Abu Dawud 1537',
    context: 'The Prophet ﷺ would say this when he feared a group of people. A dua of protection against harm from others.',
  },
  guidance: {
    emoji: '🧭', label: 'Seeking guidance',
    arabic: 'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي',
    translit: 'Allahumma ihdini wa saddidni',
    translation: '"O Allah, guide me and make me firm."',
    source: 'Sahih Muslim 2725',
    context: 'Taught by the Prophet ﷺ to Ali (RA). For being set on the right path and being made steadfast upon it.',
  },
};

const ISTIKHARAH = {
  name: 'Salat al-Istikharah',
  arabic: 'صَلَاةُ الْاِسْتِخَارَة',
  meaning: 'The Prayer of Seeking Counsel',
  steps: [
    'Perform wudu (ritual purification) if you are not already in a state of wudu.',
    'Pray 2 rakats of voluntary (Nafl) prayer — recite whatever Quran you wish after Al-Fatiha.',
    'After the final tasleem (salaam), recite the dua of Istikharah while thinking of the specific matter you are deciding.',
    'Make your decision and proceed with tawakkul (reliance on Allah). Many scholars say to repeat for up to 7 nights if uncertainty remains.',
  ],
  duaArabic:
    'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ. اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي، ثُمَّ بَارِكْ لِي فِيهِ. وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الْأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي، فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ، وَاقْدُرْ لِيَ الْخَيْرَ حَيْثُ كَانَ، ثُمَّ أَرْضِنِي بِهِ',
  translit:
    'Allahumma inni astakhiruka bi-\'ilmika, wa astaqdiruka bi-qudratika, wa as\'aluka min fadlikal-\'adheem. Fa innaka taqdiru wa la aqdir, wa ta\'lamu wa la a\'lam, wa anta \'allamul-ghuyub. Allahumma in kunta ta\'lamu anna hadhal-amra [mention matter] khayrun li fi deeni wa ma\'ashi wa \'aqibati amri, faqdurhu li wa yassirhu li, thumma barik li fih. Wa in kunta ta\'lamu annahu sharrun li fi deeni wa ma\'ashi wa \'aqibati amri, fasrifhu \'anni wasrifni \'anhu, waqdur liyal-khayra haythu kana, thumma ardini bih.',
  translation:
    '"O Allah, I seek Your guidance through Your knowledge, and I seek Your power through Your omnipotence, and I ask of Your immense favor. For You have power while I have none, You know while I do not, and You are the Knower of the unseen. O Allah, if You know this matter [mention it] to be good for me in my religion, my livelihood, and my final outcome — then decree it for me, make it easy for me, and bless me in it. But if You know this matter to be bad for me in my religion, my livelihood, and my final outcome — then turn it away from me and turn me away from it, and decree for me what is good wherever it is, and make me content with it."',
  source: 'Sahih al-Bukhari 1162',
  context:
    'Jabir ibn Abdullah (RA) said: "The Messenger of Allah ﷺ used to teach us istikharah in all matters as he used to teach us a surah of the Quran." This prayer is prescribed for any matter of genuine uncertainty — marriage, travel, business, decisions — where the outcome is unknown. It is not used for matters already known to be halal/haram or already fard/haram.',
};

const CALC_METHODS = [
  { id: 2, name: 'ISNA (North America)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm al-Qura (Saudi Arabia)' },
  { id: 5, name: 'Egyptian General Authority' },
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 7, name: 'Institute of Geophysics, Tehran' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura' },
  { id: 12, name: 'Union Organization Islamic de France' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı (Turkey)' },
];

/* ============================================================
   HELPERS — localStorage with safe fallback
   ============================================================ */

const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => storage.get(key, defaultValue));
  useEffect(() => {
    storage.set(key, value);
  }, [key, value]);
  return [value, setValue];
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(hhmm) {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

function timeToMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function minutesToCountdown(mins) {
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.floor((mins * 60) % 60);
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(m)}m ${pad(s)}s`;
}

/* ============================================================
   TTS HELPERS — Arabic speech synthesis
   ============================================================ */

function speakArabic(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = rate;
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
  return u;
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;

/* ============================================================
   SVG PRAYER FIGURE COMPONENTS — gold-on-dark posture guides
   ============================================================ */

function FigureStanding() {
  // Upright, arms folded across chest (right hand over left)
  return (
    <svg viewBox="0 0 180 220" width="180" height="220" className="mx-auto" aria-hidden="true">
      {/* Head */}
      <circle cx="90" cy="30" r="20" fill="#d4af37" opacity="0.9" />
      {/* Neck */}
      <rect x="83" y="48" width="14" height="12" rx="5" fill="#d4af37" opacity="0.85" />
      {/* Robe body */}
      <path d="M52 62 Q70 56 90 56 Q110 56 128 62 L132 170 Q90 178 48 170 Z" fill="#d4af37" opacity="0.7" />
      {/* Right arm over left — folded on chest */}
      <path d="M68 96 Q54 90 52 102 Q50 114 70 114 Q82 114 90 110"
        stroke="#d4af37" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M112 100 Q126 94 128 106 Q130 118 110 118 Q98 118 90 114"
        stroke="#d4af37" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* Legs */}
      <path d="M74 170 L70 212" stroke="#d4af37" strokeWidth="11" strokeLinecap="round" opacity="0.8" />
      <path d="M106 170 L110 212" stroke="#d4af37" strokeWidth="11" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function FigureBowing() {
  // Ruku — bent ~90° at hips, back parallel to ground, hands on knees
  return (
    <svg viewBox="0 0 200 200" width="180" height="180" className="mx-auto" aria-hidden="true">
      {/* Head — forward and down */}
      <circle cx="162" cy="78" r="19" fill="#d4af37" opacity="0.9" />
      {/* Neck connecting head to spine */}
      <line x1="145" y1="88" x2="130" y2="92" stroke="#d4af37" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
      {/* Back — horizontal */}
      <line x1="130" y1="92" x2="48" y2="95" stroke="#d4af37" strokeWidth="13" strokeLinecap="round" opacity="0.8" />
      {/* Hips down — legs vertical */}
      <line x1="58" y1="95" x2="55" y2="175" stroke="#d4af37" strokeWidth="12" strokeLinecap="round" opacity="0.8" />
      <line x1="78" y1="95" x2="80" y2="175" stroke="#d4af37" strokeWidth="12" strokeLinecap="round" opacity="0.8" />
      {/* Arms — hands on knees */}
      <line x1="130" y1="92" x2="62" y2="130" stroke="#d4af37" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
      <line x1="62" y1="130" x2="58" y2="145" stroke="#d4af37" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      {/* Feet */}
      <line x1="55" y1="175" x2="38" y2="185" stroke="#d4af37" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <line x1="80" y1="175" x2="63" y2="185" stroke="#d4af37" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function FigureProstrating() {
  // Sujud — forehead, nose, hands, knees, toes on ground; compact triangular silhouette
  return (
    <svg viewBox="0 0 200 160" width="180" height="145" className="mx-auto" aria-hidden="true">
      {/* Ground line */}
      <line x1="20" y1="135" x2="180" y2="135" stroke="#d4af37" strokeWidth="2" opacity="0.25" />
      {/* Head on ground */}
      <circle cx="155" cy="118" r="17" fill="#d4af37" opacity="0.9" />
      {/* Forehead touching ground */}
      <ellipse cx="155" cy="134" rx="12" ry="4" fill="#d4af37" opacity="0.5" />
      {/* Back rising to hips */}
      <path d="M138 118 Q100 85 68 75 Q52 70 45 78" stroke="#d4af37" strokeWidth="13" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Hips at peak */}
      <ellipse cx="45" cy="80" rx="14" ry="10" fill="#d4af37" opacity="0.75" />
      {/* Legs going back down to knees on ground */}
      <path d="M42 88 Q35 115 42 132" stroke="#d4af37" strokeWidth="11" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M58 85 Q55 112 62 130" stroke="#d4af37" strokeWidth="11" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Hands on ground either side of head */}
      <ellipse cx="128" cy="134" rx="14" ry="5" fill="#d4af37" opacity="0.65" />
      <ellipse cx="178" cy="134" rx="14" ry="5" fill="#d4af37" opacity="0.65" />
      {/* Toes */}
      <ellipse cx="45" cy="134" rx="10" ry="4" fill="#d4af37" opacity="0.55" />
      <ellipse cx="63" cy="134" rx="10" ry="4" fill="#d4af37" opacity="0.55" />
    </svg>
  );
}

function FigureSitting() {
  // Jalsa / Tashahhud — kneeling on heels, back upright, hands on thighs
  return (
    <svg viewBox="0 0 180 220" width="180" height="220" className="mx-auto" aria-hidden="true">
      {/* Head */}
      <circle cx="90" cy="32" r="20" fill="#d4af37" opacity="0.9" />
      {/* Neck */}
      <rect x="83" y="50" width="14" height="12" rx="5" fill="#d4af37" opacity="0.85" />
      {/* Upper body / robe torso */}
      <path d="M58 62 Q74 56 90 56 Q106 56 122 62 L124 130 Q90 136 56 130 Z" fill="#d4af37" opacity="0.75" />
      {/* Arms resting on thighs */}
      <path d="M62 100 Q58 118 72 130" stroke="#d4af37" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M118 100 Q122 118 108 130" stroke="#d4af37" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Thighs going forward from sitting position */}
      <path d="M60 130 Q44 138 38 148" stroke="#d4af37" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M120 130 Q136 138 142 148" stroke="#d4af37" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* Lower legs folded back under body */}
      <path d="M38 148 Q28 168 38 185" stroke="#d4af37" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M142 148 Q152 168 142 185" stroke="#d4af37" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* Feet/heels on ground */}
      <ellipse cx="44" cy="188" rx="16" ry="5" fill="#d4af37" opacity="0.6" />
      <ellipse cx="136" cy="188" rx="16" ry="5" fill="#d4af37" opacity="0.6" />
    </svg>
  );
}

function FigureTasleem() {
  // Tasleem — sitting, head turned to right side
  return (
    <svg viewBox="0 0 180 220" width="180" height="220" className="mx-auto" aria-hidden="true">
      {/* Head turned right — offset and slightly rotated */}
      <circle cx="106" cy="30" r="20" fill="#d4af37" opacity="0.9" />
      {/* Ear / face direction indicator */}
      <ellipse cx="122" cy="30" rx="6" ry="9" fill="#d4af37" opacity="0.5" />
      {/* Neck — slightly angled */}
      <line x1="100" y1="48" x2="90" y2="60" stroke="#d4af37" strokeWidth="12" strokeLinecap="round" opacity="0.85" />
      {/* Upper body / robe torso — same as sitting */}
      <path d="M58 62 Q74 56 90 56 Q106 56 122 62 L124 130 Q90 136 56 130 Z" fill="#d4af37" opacity="0.75" />
      {/* Arms resting on thighs */}
      <path d="M62 100 Q58 118 72 130" stroke="#d4af37" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M118 100 Q122 118 108 130" stroke="#d4af37" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Thighs */}
      <path d="M60 130 Q44 138 38 148" stroke="#d4af37" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M120 130 Q136 138 142 148" stroke="#d4af37" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.75" />
      {/* Lower legs */}
      <path d="M38 148 Q28 168 38 185" stroke="#d4af37" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M142 148 Q152 168 142 185" stroke="#d4af37" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* Feet */}
      <ellipse cx="44" cy="188" rx="16" ry="5" fill="#d4af37" opacity="0.6" />
      <ellipse cx="136" cy="188" rx="16" ry="5" fill="#d4af37" opacity="0.6" />
    </svg>
  );
}

const PHASE_FIGURES = {
  standing: FigureStanding,
  bowing: FigureBowing,
  prostrating: FigureProstrating,
  sitting: FigureSitting,
  tasleem: FigureTasleem,
};

/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  // Persisted settings
  const [location, setLocation] = useLocalStorage('pc_location', null);
  const [method, setMethod] = useLocalStorage('pc_method', 2);
  const [madhhab, setMadhhab] = useLocalStorage('pc_madhhab', 0);
  const [guidedReciter, setGuidedReciter] = useLocalStorage('pc_reciter', 'alafasy');
  const [guidedSpeed, setGuidedSpeed] = useLocalStorage('pc_speed', 1.0);
  const [notifyEnabled, setNotifyEnabled] = useLocalStorage('pc_notify', false);

  // Session state
  const [cityInput, setCityInput] = useState('');
  const [times, setTimes] = useState(null);
  const [hijriDate, setHijriDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(new Date());
  const [adhanIndex, setAdhanIndex] = useState(0);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [openPrayer, setOpenPrayer] = useState(null);
  const [openMood, setOpenMood] = useState(null);
  const [openIstikharah, setOpenIstikharah] = useState(false);
  const [openGuided, setOpenGuided] = useState(false);
  const [guidedRakats, setGuidedRakats] = useState(2);

  const adhanAudioRef = useRef(null);
  const guidedAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const triggeredTodayRef = useRef(new Set());

  /* Tick every second */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Fetch prayer times */
  const fetchTimes = useCallback(async (loc) => {
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const d = new Date();
      const dateStr = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
      const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${loc.lat}&longitude=${loc.lon}&method=${method}&school=${madhhab}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 200) {
        setTimes(data.data.timings);
        setHijriDate(data.data.date.hijri);
        triggeredTodayRef.current = new Set();
      } else {
        setError('Failed to load prayer times');
      }
    } catch {
      setError('Network error — check connection');
    } finally {
      setLoading(false);
    }
  }, [method, madhhab]);

  useEffect(() => {
    if (location) fetchTimes(location);
  }, [location, fetchTimes]);

  /* Auto-refresh at midnight */
  useEffect(() => {
    if (!location) return;
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    if (h === 0 && m === 0 && s < 2) fetchTimes(location);
  }, [now, location, fetchTimes]);

  /* Prayer-time transition detection */
  useEffect(() => {
    if (!times) return;
    const cur = nowMinutes();
    for (const p of PRAYER_ORDER) {
      const t = timeToMinutes(times[p]);
      const diff = Math.abs(cur - t);
      if (diff < 0.5 && !triggeredTodayRef.current.has(p)) {
        triggeredTodayRef.current.add(p);
        triggerPrayer(p);
      }
    }
  }, [now, times]); // eslint-disable-line

  function triggerPrayer(prayerName) {
    if (notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`It is time for ${prayerName}`, {
          body: `${PRAYERS[prayerName].arabic} — ${PRAYERS[prayerName].totalDescription}`,
          silent: false,
        });
      } catch {}
    }
    const pool = prayerName === 'Fajr'
      ? ADHAN_LIBRARY.filter(a => a.fajrOnly).concat(ADHAN_LIBRARY.filter(a => !a.fajrOnly))
      : ADHAN_LIBRARY.filter(a => !a.fajrOnly);
    const pick = pool[adhanIndex % pool.length];
    setAdhanIndex((adhanIndex + 1) % pool.length);
    playAdhan(pick.url);
  }

  function playAdhan(url) {
    if (!adhanAudioRef.current) return;
    adhanAudioRef.current.src = url;
    adhanAudioRef.current.play()
      .then(() => setIsAdhanPlaying(true))
      .catch(() => setIsAdhanPlaying(false));
  }

  function stopAdhan() {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
      setIsAdhanPlaying(false);
    }
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      setError('Notifications not supported');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifyEnabled(true);
      new Notification('Prayer reminders enabled', {
        body: 'You will be notified at each prayer time.',
      });
    }
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      setError('Wake lock not supported on this device');
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener('release', () => setWakeLockActive(false));
    } catch (e) {
      setError('Could not enable wake lock: ' + e.message);
    }
  }

  async function releaseWakeLock() {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }

  // Re-acquire wake lock when tab returns to focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wakeLockActive && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [wakeLockActive]); // eslint-disable-line

  async function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        try {
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const d = await r.json();
          setLocation({ lat, lon, city: d.city || d.locality || 'Your Location', country: d.countryName || '' });
        } catch {
          setLocation({ lat, lon, city: 'Your Location', country: '' });
        }
      },
      () => { setError('Location denied — please enter a city'); setLoading(false); }
    );
  }

  async function setCityManually() {
    if (!cityInput.trim()) return;
    setLoading(true); setError(null);
    try {
      const parts = cityInput.split(',').map(s => s.trim());
      const city = parts[0], country = parts[1] || '';
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${madhhab}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.code === 200) {
        const meta = d.data.meta;
        setLocation({ lat: meta.latitude, lon: meta.longitude, city, country });
        setTimes(d.data.timings);
        setHijriDate(d.data.date.hijri);
      } else setError('City not found');
    } catch { setError('Failed to look up city'); }
    finally { setLoading(false); }
  }

  const { currentPrayer, nextPrayer, minutesToNext } = (() => {
    if (!times) return { currentPrayer: null, nextPrayer: null, minutesToNext: 0 };
    const cur = nowMinutes();
    let current = null, next = null, minsTo = 0;
    for (let i = 0; i < PRAYER_ORDER.length; i++) {
      const p = PRAYER_ORDER[i];
      const t = timeToMinutes(times[p]);
      if (cur >= t) current = p;
      if (cur < t && !next) { next = p; minsTo = t - cur; }
    }
    if (!next) { next = 'Fajr'; minsTo = (24 * 60) - cur + timeToMinutes(times.Fajr); }
    return { currentPrayer: current, nextPrayer: next, minutesToNext: minsTo };
  })();

  /* ============================================================ */

  return (
    <div className="min-h-screen w-full text-cream star-bg" style={{
      background: 'radial-gradient(ellipse at top, #1a2744 0%, #0a1628 50%, #050b1a 100%)',
    }}>
      <audio ref={adhanAudioRef} onEnded={() => setIsAdhanPlaying(false)} preload="none" />
      <audio ref={guidedAudioRef} preload="none" />

      <div className="relative max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12">

        {/* Header */}
        <header className="flex items-start justify-between mb-10 fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle, #d4af37 0%, #8b7d3f 100%)' }}>
                <Compass className="w-5 h-5 text-midnight" />
              </div>
              <span className="text-xs tracking-[0.4em] uppercase gold-text">Bismillah</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl gold-text leading-none">Prayer Companion</h1>
            <p className="text-sm text-gold-dim mt-2 italic font-display">A remembrance through the day</p>
          </div>
          <button onClick={() => setShowSettings(true)}
            className="p-3 rounded-full border gold-border hover:bg-gold/10 transition">
            <Settings className="w-5 h-5 gold-text" />
          </button>
        </header>

        <div className="ornament mb-10"></div>

        {/* Location setup */}
        {!location && (
          <div className="max-w-lg mx-auto text-center fade-in">
            <MapPin className="w-12 h-12 gold-text mx-auto mb-4 shimmer" />
            <h2 className="font-display text-3xl mb-2">Set Your Location</h2>
            <p className="text-gold-dim mb-8 text-sm">Prayer times update automatically with sunrise and sunset for your area.</p>

            <button onClick={useMyLocation} disabled={loading}
              className="w-full mb-4 py-4 rounded-sm border-2 gold-border bg-gold/5 hover:bg-gold/15 transition flex items-center justify-center gap-3 uppercase text-xs tracking-[0.3em]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              Use My Location
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gold/20"></div>
              <span className="text-xs text-gold-dim tracking-widest">OR</span>
              <div className="flex-1 h-px bg-gold/20"></div>
            </div>

            <div className="flex gap-2">
              <input value={cityInput} onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setCityManually()}
                placeholder="City, Country (e.g., Frisco, USA)"
                className="flex-1 px-4 py-3 bg-transparent border gold-border rounded-sm text-cream placeholder-gold-dim/60 focus:outline-none focus:border-gold" />
              <button onClick={setCityManually}
                className="px-5 rounded-sm bg-gold text-midnight font-semibold hover:bg-gold-bright transition">
                Go
              </button>
            </div>
            {error && <p className="text-rose-400 text-sm mt-4">{error}</p>}
          </div>
        )}

        {/* Dashboard */}
        {location && times && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 fade-in">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 gold-text" />
                <span>{location.city}{location.country ? `, ${location.country}` : ''}</span>
                <button onClick={() => { setLocation(null); setTimes(null); }}
                  className="ml-2 text-xs gold-text hover:underline">change</button>
              </div>
              {hijriDate && (
                <div className="text-sm text-right">
                  <div className="gold-text font-arabic text-base">{hijriDate.day} {hijriDate.month.ar} {hijriDate.year}</div>
                  <div className="text-xs text-gold-dim">{hijriDate.weekday.en} · {hijriDate.month.en}</div>
                </div>
              )}
            </div>

            {/* Hero */}
            <div className="relative overflow-hidden rounded-sm border gold-border p-8 md:p-12 mb-10 fade-in"
              style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(26,39,68,0.5))' }}>
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #d4af37, transparent)' }}></div>
              <div className="relative grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-xs tracking-[0.4em] uppercase gold-text mb-3">Next Prayer</div>
                  <div className="font-arabic text-5xl md:text-6xl gold-text mb-2">{PRAYERS[nextPrayer].arabic}</div>
                  <div className="font-display text-4xl md:text-5xl">{nextPrayer}</div>
                  <div className="text-sm text-gold-dim mt-2">{PRAYERS[nextPrayer].meaning} · {PRAYERS[nextPrayer].totalDescription}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs tracking-[0.4em] uppercase gold-text mb-2">Begins in</div>
                  <div className="font-display text-5xl md:text-6xl tabular-nums">
                    {minutesToCountdown(minutesToNext)}
                  </div>
                  <div className="text-2xl font-display gold-text mt-2">{formatTime(times[nextPrayer])}</div>
                  <div className="text-xs text-gold-dim mt-1">Current: <span className="gold-text">{currentPrayer || '—'}</span></div>
                </div>
              </div>
            </div>

            {/* Five prayers */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
              {PRAYER_ORDER.map((p) => {
                const isNext = p === nextPrayer;
                const isCurrent = p === currentPrayer;
                return (
                  <button key={p} onClick={() => setOpenPrayer(p)}
                    className={`group relative p-5 rounded-sm border transition text-left fade-in ${
                      isNext ? 'border-gold bg-gold/10' :
                      isCurrent ? 'border-gold/60 bg-gold/5' :
                      'gold-border hover:border-gold/60 hover:bg-gold/5'
                    }`}>
                    <div className="font-arabic text-2xl gold-text mb-1">{PRAYERS[p].arabic}</div>
                    <div className="font-display text-2xl">{p}</div>
                    <div className="text-sm text-gold-dim tabular-nums">{formatTime(times[p])}</div>
                    <div className="text-[10px] uppercase tracking-wider mt-2 text-gold-dim">
                      {PRAYERS[p].fard} Fard{PRAYERS[p].sunnah > 0 ? ` · ${PRAYERS[p].sunnah} Sunnah` : ''}
                    </div>
                    {isNext && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold shimmer"></div>}
                    <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-gold-dim opacity-0 group-hover:opacity-100 transition" />
                  </button>
                );
              })}
            </div>

            {/* Other times */}
            <div className="grid grid-cols-3 gap-3 mb-10 text-center text-xs">
              {['Sunrise', 'Imsak', 'Midnight'].map(k => times[k] && (
                <div key={k} className="p-3 rounded-sm border border-gold/20">
                  <div className="text-[10px] uppercase tracking-widest gold-text">{k}</div>
                  <div className="tabular-nums text-sm mt-1">{formatTime(times[k])}</div>
                </div>
              ))}
            </div>

            <div className="ornament mb-10"></div>

            {/* Action cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              <button onClick={() => setOpenGuided(true)}
                className="p-6 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                <Headphones className="w-8 h-8 gold-text mb-3" />
                <div className="font-display text-2xl mb-1">Guided Prayer</div>
                <div className="text-xs text-gold-dim">Walk through 2, 3, or 4 rakats with a reciter of your choice.</div>
              </button>

              <button onClick={() => setOpenIstikharah(true)}
                className="p-6 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                <Compass className="w-8 h-8 gold-text mb-3" />
                <div className="font-display text-2xl mb-1">Istikharah</div>
                <div className="text-xs text-gold-dim">Seeking counsel from Allah for a decision you are facing.</div>
              </button>

              <button onClick={() => isAdhanPlaying ? stopAdhan() : playAdhan(ADHAN_LIBRARY[adhanIndex].url)}
                className="p-6 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                {isAdhanPlaying ? <Pause className="w-8 h-8 gold-text mb-3" /> : <Play className="w-8 h-8 gold-text mb-3" />}
                <div className="font-display text-2xl mb-1">Preview Adhan</div>
                <div className="text-xs text-gold-dim">{ADHAN_LIBRARY[adhanIndex].name}</div>
              </button>
            </div>

            {/* Mood section */}
            <div className="mb-10">
              <h2 className="font-display text-3xl mb-2 gold-text">A Dua for Every Moment</h2>
              <p className="text-sm text-gold-dim mb-6 italic">Authentic supplications from the Quran and Sunnah for the state your heart is in.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(MOOD_DUAS).map(([key, mood]) => (
                  <button key={key} onClick={() => setOpenMood(key)}
                    className="p-4 rounded-sm border gold-border hover:bg-gold/10 transition text-center">
                    <div className="text-3xl mb-2">{mood.emoji}</div>
                    <div className="text-sm font-display">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="rounded-sm border gold-border p-5 mb-10 grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-display">Prayer Notifications</div>
                  <div className="text-xs text-gold-dim">Alerts when each prayer time arrives</div>
                </div>
                <button onClick={notifyEnabled ? () => setNotifyEnabled(false) : requestNotifications}
                  className={`p-2 rounded-full border transition ${notifyEnabled ? 'bg-gold border-gold text-midnight' : 'gold-border'}`}>
                  {notifyEnabled ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4 gold-text" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-display">Keep Screen Awake</div>
                  <div className="text-xs text-gold-dim">So the adhan plays when time arrives</div>
                </div>
                <button onClick={wakeLockActive ? releaseWakeLock : requestWakeLock}
                  className={`p-2 rounded-full border transition ${wakeLockActive ? 'bg-gold border-gold text-midnight' : 'gold-border'}`}>
                  {wakeLockActive ? <Check className="w-4 h-4" /> : <Sun className="w-4 h-4 gold-text" />}
                </button>
              </div>
            </div>

            {isAdhanPlaying && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full border-2 backdrop-strong flex items-center gap-3 shadow-2xl"
                style={{ borderColor: '#d4af37', background: 'rgba(10, 22, 40, 0.9)' }}>
                <div className="w-2 h-2 rounded-full bg-gold shimmer"></div>
                <span className="text-sm font-display gold-text">Adhan playing · {ADHAN_LIBRARY[adhanIndex].name}</span>
                <button onClick={stopAdhan} className="ml-2"><X className="w-4 h-4" /></button>
              </div>
            )}
          </>
        )}

        {/* Prayer detail modal */}
        {openPrayer && (
          <Modal onClose={() => setOpenPrayer(null)}>
            <div className="font-arabic text-5xl gold-text mb-2">{PRAYERS[openPrayer].arabic}</div>
            <div className="font-display text-4xl mb-1">{openPrayer}</div>
            <div className="text-sm text-gold-dim italic mb-6">{PRAYERS[openPrayer].meaning} · {PRAYERS[openPrayer].window}</div>
            {times && (
              <div className="inline-block px-4 py-2 rounded-sm bg-gold/10 border gold-border text-xl tabular-nums mb-6">
                {formatTime(times[openPrayer])}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mb-6 text-center">
              <div className="p-3 rounded-sm border gold-border">
                <div className="text-3xl font-display gold-text">{PRAYERS[openPrayer].fard}</div>
                <div className="text-[10px] uppercase tracking-widest mt-1">Fard<br/>(obligatory)</div>
              </div>
              <div className="p-3 rounded-sm border gold-border">
                <div className="text-3xl font-display gold-text">{PRAYERS[openPrayer].sunnah}</div>
                <div className="text-[10px] uppercase tracking-widest mt-1">Sunnah<br/>(emphasized)</div>
              </div>
              <div className="p-3 rounded-sm border gold-border">
                <div className="text-3xl font-display gold-text">{PRAYERS[openPrayer].nafl}</div>
                <div className="text-[10px] uppercase tracking-widest mt-1">Nafl<br/>(voluntary)</div>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-xs uppercase tracking-widest gold-text mb-2">Structure</div>
              <div className="text-sm">{PRAYERS[openPrayer].totalDescription}</div>
            </div>
            <div className="mb-4">
              <div className="text-xs uppercase tracking-widest gold-text mb-2">About this prayer</div>
              <div className="text-sm leading-relaxed">{PRAYERS[openPrayer].description}</div>
            </div>
            <div className="mb-6">
              <div className="text-xs uppercase tracking-widest gold-text mb-2">History & Tradition</div>
              <div className="text-sm leading-relaxed">{PRAYERS[openPrayer].history}</div>
            </div>
            <button onClick={() => { setOpenPrayer(null); setOpenGuided(true); }}
              className="w-full py-3 rounded-sm bg-gold text-midnight font-semibold hover:bg-gold-bright transition flex items-center justify-center gap-2">
              <Headphones className="w-4 h-4" /> Open Guided Prayer
            </button>
          </Modal>
        )}

        {/* Mood dua modal */}
        {openMood && (
          <MoodDuaModal moodKey={openMood} onClose={() => setOpenMood(null)} />
        )}

        {/* Istikharah modal */}
        {openIstikharah && (
          <IstikharahModal onClose={() => setOpenIstikharah(false)} />
        )}

        {/* Guided prayer modal */}
        {openGuided && (
          <GuidedPrayer
            rakats={guidedRakats}
            setRakats={setGuidedRakats}
            reciter={guidedReciter}
            setReciter={setGuidedReciter}
            speed={guidedSpeed}
            setSpeed={setGuidedSpeed}
            audioRef={guidedAudioRef}
            onClose={() => setOpenGuided(false)}
          />
        )}

        {/* Settings modal */}
        {showSettings && (
          <Modal onClose={() => setShowSettings(false)}>
            <div className="font-display text-3xl mb-6">Settings</div>

            <div className="mb-5">
              <label className="text-xs uppercase tracking-widest gold-text mb-2 block">Calculation Method</label>
              <select value={method} onChange={e => setMethod(Number(e.target.value))}
                className="w-full px-3 py-2 bg-midnight border gold-border rounded-sm focus:outline-none focus:border-gold">
                {CALC_METHODS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="text-xs text-gold-dim mt-2">Different Islamic authorities use slightly different angle calculations for Fajr and Isha.</div>
            </div>

            <div className="mb-5">
              <label className="text-xs uppercase tracking-widest gold-text mb-2 block">Madhhab (for Asr timing)</label>
              <div className="flex gap-2">
                <button onClick={() => setMadhhab(0)} className={`flex-1 py-2 rounded-sm border text-sm ${madhhab === 0 ? 'bg-gold text-midnight border-gold font-semibold' : 'gold-border'}`}>
                  Standard (Shafi/Maliki/Hanbali)
                </button>
                <button onClick={() => setMadhhab(1)} className={`flex-1 py-2 rounded-sm border text-sm ${madhhab === 1 ? 'bg-gold text-midnight border-gold font-semibold' : 'gold-border'}`}>
                  Hanafi
                </button>
              </div>
            </div>

            <button onClick={() => { location && fetchTimes(location); setShowSettings(false); }}
              className="w-full py-3 rounded-sm bg-gold text-midnight font-semibold hover:bg-gold-bright transition">
              Apply & Refresh
            </button>
          </Modal>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gold/20 text-center text-xs text-gold-dim">
          <div className="ornament mb-4"></div>
          <p className="italic font-display text-sm mb-2">"Indeed, prayer prohibits immorality and wrongdoing." — Quran 29:45</p>
          <p className="text-[10px] tracking-widest uppercase">Prayer times by AlAdhan API · Duas from verified collections</p>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================
   MODAL — shared overlay component
   ============================================================ */

function Modal({ children, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-strong" onClick={onClose}
      style={{ background: 'rgba(5, 11, 26, 0.85)' }}>
      <div onClick={e => e.stopPropagation()}
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-sm border-2 p-8 text-cream fade-in"
        style={{ background: 'linear-gradient(135deg, #1a2744, #0a1628)', borderColor: 'rgba(212,175,55,0.4)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gold/10 transition">
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   TTS PLAY/STOP BUTTON — shared UI for Arabic audio playback
   ============================================================ */

function TtsButton({ text, rate = 0.85 }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  function handleToggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      if (!hasSpeechSynthesis) return;
      const u = speakArabic(text, rate);
      if (u) {
        setSpeaking(true);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
      }
    }
  }

  if (!hasSpeechSynthesis) {
    return (
      <button disabled title="Not supported on this device"
        className="flex items-center gap-2 px-4 py-2 rounded-sm border border-gold/20 text-gold-dim/50 cursor-not-allowed text-sm">
        <PlayCircle className="w-4 h-4" />
        Listen (not supported on this device)
      </button>
    );
  }

  return (
    <button onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-sm border transition text-sm font-semibold ${
        speaking
          ? 'bg-rose-900/40 border-rose-500/60 text-rose-300 hover:bg-rose-900/60'
          : 'bg-gold/10 border-gold/40 gold-text hover:bg-gold/20'
      }`}>
      {speaking
        ? <><StopCircle className="w-4 h-4" /> Stop</>
        : <><PlayCircle className="w-4 h-4" /> Listen to pronunciation</>
      }
    </button>
  );
}

/* ============================================================
   ISTIKHARAH MODAL — with TTS
   ============================================================ */

function IstikharahModal({ onClose }) {
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  return (
    <Modal onClose={onClose}>
      <Compass className="w-10 h-10 gold-text mx-auto mb-3" />
      <div className="font-arabic text-4xl gold-text text-center mb-2">{ISTIKHARAH.arabic}</div>
      <div className="font-display text-3xl text-center mb-1">{ISTIKHARAH.name}</div>
      <div className="text-sm text-gold-dim text-center italic mb-6">{ISTIKHARAH.meaning}</div>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest gold-text mb-3">How to pray</div>
        <ol className="space-y-3">
          {ISTIKHARAH.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/20 border gold-border flex items-center justify-center text-xs gold-text">{i+1}</span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="p-5 rounded-sm border gold-border mb-3" style={{ background: 'rgba(212,175,55,0.05)' }}>
        <div className="font-arabic text-xl leading-loose text-right gold-text">{ISTIKHARAH.duaArabic}</div>
      </div>

      {/* TTS button below the Arabic dua */}
      <div className="mb-4">
        <TtsButton text={ISTIKHARAH.duaArabic} />
      </div>

      <details className="mb-4">
        <summary className="text-xs uppercase tracking-widest gold-text cursor-pointer mb-2">Transliteration</summary>
        <div className="text-sm italic leading-relaxed mt-2">{ISTIKHARAH.translit}</div>
      </details>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">Translation</div>
        <div className="text-sm leading-relaxed">{ISTIKHARAH.translation}</div>
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">About Istikharah</div>
        <div className="text-sm leading-relaxed">{ISTIKHARAH.context}</div>
      </div>

      <div className="text-xs text-gold-dim italic border-t gold-border pt-3">Source: {ISTIKHARAH.source}</div>
    </Modal>
  );
}

/* ============================================================
   MOOD DUA MODAL — with TTS
   ============================================================ */

function MoodDuaModal({ moodKey, onClose }) {
  const mood = MOOD_DUAS[moodKey];

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  return (
    <Modal onClose={onClose}>
      <div className="text-5xl text-center mb-4">{mood.emoji}</div>
      <div className="font-display text-3xl text-center mb-6">{mood.label}</div>
      <div className="p-5 rounded-sm border gold-border mb-3" style={{ background: 'rgba(212,175,55,0.05)' }}>
        <div className="font-arabic text-2xl leading-loose text-right gold-text">{mood.arabic}</div>
      </div>

      {/* TTS button after Arabic, before transliteration */}
      <div className="mb-4">
        <TtsButton text={mood.arabic} />
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">Transliteration</div>
        <div className="text-sm italic leading-relaxed">{mood.translit}</div>
      </div>
      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">Translation</div>
        <div className="text-sm leading-relaxed">{mood.translation}</div>
      </div>
      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">Context</div>
        <div className="text-sm leading-relaxed">{mood.context}</div>
      </div>
      <div className="text-xs text-gold-dim italic border-t gold-border pt-3">Source: {mood.source}</div>
    </Modal>
  );
}

/* ============================================================
   GUIDED PRAYER — step-by-step with auto-play mode
   ============================================================ */

// Arabic duas spoken by TTS during silent phases
const STEP_DUAS = {
  ruku: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ، سُبْحَانَ رَبِّيَ الْعَظِيمِ، سُبْحَانَ رَبِّيَ الْعَظِيمِ',
  itidal: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ',
  sujud: 'سُبْحَانَ رَبِّيَ الْأَعْلَى، سُبْحَانَ رَبِّيَ الْأَعْلَى، سُبْحَانَ رَبِّيَ الْأَعْلَى',
  jalsa: 'رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي',
  tashahhudMiddle: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
  tashahhudFinal: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ. اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
  tasleem: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',
};

function GuidedPrayer({ rakats, setRakats, reciter, setReciter, speed, setSpeed, audioRef, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [autoDuration, setAutoDuration] = useState(0);
  const [prayerComplete, setPrayerComplete] = useState(false);

  const autoWakeLockRef = useRef(null);
  const autoStepTimerRef = useRef(null);
  const autoCountdownIntervalRef = useRef(null);
  const autoPlayRef = useRef(false);

  const reciterInfo = RECITERS.find(r => r.id === reciter);

  const buildSteps = (n) => {
    const steps = [
      {
        phase: 'Niyyah', arabic: 'النية',
        text: 'Make intention (niyyah) silently in your heart for the prayer you are about to offer.',
        audio: null, phaseType: 'standing', duration: 8, ttsDua: null,
      },
      {
        phase: 'Takbir al-Ihram', arabic: 'اللَّهُ أَكْبَر',
        text: 'Raise your hands to your ears (or shoulders) and say "Allahu Akbar". You have now entered the prayer.',
        audio: null, phaseType: 'standing', duration: 4, ttsDua: null,
      },
    ];
    for (let i = 1; i <= n; i++) {
      steps.push({
        phase: `Rakat ${i} — Qiyam`, arabic: 'القيام',
        text: 'Place your right hand over your left on your chest. Recite the opening (Thana), then Al-Fatiha, then a short surah (only in first 2 rakats).',
        audio: reciterInfo?.fullFatiha,
        phaseType: 'standing',
        duration: i <= 2 ? 55 : 42,
        ttsDua: null,
      });
      steps.push({
        phase: `Rakat ${i} — Ruku`, arabic: 'الركوع',
        text: 'Say "Allahu Akbar" and bow, placing hands on knees. Say "Subhana Rabbiyal-Adheem" (Glory to my Lord, the Most Great) 3 times.',
        audio: null, phaseType: 'bowing', duration: 15, ttsDua: STEP_DUAS.ruku,
      });
      steps.push({
        phase: `Rakat ${i} — I'tidal`, arabic: 'الاعتدال',
        text: 'Rise saying "Sami\'allahu liman hamidah" (Allah hears the one who praises Him). Then standing: "Rabbana wa lakal-hamd".',
        audio: null, phaseType: 'standing', duration: 6, ttsDua: STEP_DUAS.itidal,
      });
      steps.push({
        phase: `Rakat ${i} — Sujud 1`, arabic: 'السجود',
        text: 'Say "Allahu Akbar" and prostrate with forehead, nose, hands, knees, toes on ground. Say "Subhana Rabbiyal-A\'la" (Glory to my Lord, the Most High) 3 times.',
        audio: null, phaseType: 'prostrating', duration: 15, ttsDua: STEP_DUAS.sujud,
      });
      steps.push({
        phase: `Rakat ${i} — Jalsa`, arabic: 'الجلسة',
        text: 'Rise to sitting position between the two prostrations. Say "Rabbigh-firli" (My Lord, forgive me).',
        audio: null, phaseType: 'sitting', duration: 8, ttsDua: STEP_DUAS.jalsa,
      });
      steps.push({
        phase: `Rakat ${i} — Sujud 2`, arabic: 'السجود',
        text: 'Prostrate again. Say "Subhana Rabbiyal-A\'la" 3 times. This completes one rakat.',
        audio: null, phaseType: 'prostrating', duration: 15, ttsDua: STEP_DUAS.sujud,
      });
      if (i === 2 && n > 2) {
        steps.push({
          phase: 'Middle Tashahhud (sitting)', arabic: 'التشهد',
          text: 'Sit and recite At-Tahiyyat: "At-tahiyyatu lillahi was-salawatu wat-tayyibat..." ending with the shahadah. Then rise saying "Allahu Akbar" to continue.',
          audio: null, phaseType: 'sitting', duration: 25, ttsDua: STEP_DUAS.tashahhudMiddle,
        });
      }
      if (i === n) {
        steps.push({
          phase: 'Final Tashahhud + Durood', arabic: 'الصلاة على النبي',
          text: 'Recite the full Tashahhud, then the Durood (Salawat) on the Prophet ﷺ, then a dua of your choice.',
          audio: null, phaseType: 'sitting', duration: 50, ttsDua: STEP_DUAS.tashahhudFinal,
        });
        steps.push({
          phase: 'Tasleem', arabic: 'التسليم',
          text: 'Turn your head to the right saying "As-salamu alaykum wa rahmatullah", then to the left with the same. Prayer is complete.',
          audio: null, phaseType: 'tasleem', duration: 8, ttsDua: STEP_DUAS.tasleem,
        });
      }
    }
    return steps;
  };

  const steps = buildSteps(rakats);
  const step = steps[currentStep];
  const Figure = PHASE_FIGURES[step.phaseType] || FigureStanding;

  /* ---- Auto-play wake lock visibility handler ---- */
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState === 'visible' && autoPlayRef.current && !autoWakeLockRef.current) {
        try {
          if ('wakeLock' in navigator) {
            autoWakeLockRef.current = await navigator.wakeLock.request('screen');
          }
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /* ---- Reset when rakats change ---- */
  useEffect(() => {
    if (autoPlayRef.current) stopAutoPlay();
    setCurrentStep(0);
    setPrayerComplete(false);
  }, [rakats]); // eslint-disable-line

  /* ---- Cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      autoPlayRef.current = false;
      clearTimeout(autoStepTimerRef.current);
      clearInterval(autoCountdownIntervalRef.current);
      audioRef.current?.pause();
      stopSpeaking();
      if (autoWakeLockRef.current) {
        autoWakeLockRef.current.release().catch(() => {});
        autoWakeLockRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  /* ---- Audio playback speed sync ---- */
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, audioRef]);

  /* ---- Auto-play engine ---- */
  function startAutoPlay() {
    setPrayerComplete(false);
    setAutoPlay(true);
    autoPlayRef.current = true;

    // Acquire wake lock
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => {
        autoWakeLockRef.current = wl;
      }).catch(() => {});
    }

    runAutoStep(currentStep, steps, speed);
  }

  function stopAutoPlay() {
    setAutoPlay(false);
    autoPlayRef.current = false;
    clearTimeout(autoStepTimerRef.current);
    clearInterval(autoCountdownIntervalRef.current);
    setAutoCountdown(0);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onloadedmetadata = null;
      audioRef.current.pause();
    }
    stopSpeaking();

    if (autoWakeLockRef.current) {
      autoWakeLockRef.current.release().catch(() => {});
      autoWakeLockRef.current = null;
    }
  }

  function runAutoStep(stepIdx, stepsArr, spd) {
    if (!autoPlayRef.current) return;

    const s = stepsArr[stepIdx];
    setCurrentStep(stepIdx);

    clearTimeout(autoStepTimerRef.current);
    clearInterval(autoCountdownIntervalRef.current);

    // Clear previous audio handlers
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onloadedmetadata = null;
    }

    const advance = () => {
      if (!autoPlayRef.current) return;
      clearInterval(autoCountdownIntervalRef.current);
      setIsPlaying(false);

      if (stepIdx + 1 >= stepsArr.length) {
        // Prayer complete
        setAutoPlay(false);
        autoPlayRef.current = false;
        setPrayerComplete(true);
        stopSpeaking();
        if (autoWakeLockRef.current) {
          autoWakeLockRef.current.release().catch(() => {});
          autoWakeLockRef.current = null;
        }
      } else {
        runAutoStep(stepIdx + 1, stepsArr, spd);
      }
    };

    const startCountdown = (durSecs) => {
      const rounded = Math.round(durSecs);
      setAutoDuration(rounded);
      setAutoCountdown(rounded);
      autoCountdownIntervalRef.current = setInterval(() => {
        setAutoCountdown(prev => {
          if (prev <= 1) { clearInterval(autoCountdownIntervalRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    };

    // Speak TTS dua for silent phases
    if (s.ttsDua && hasSpeechSynthesis) {
      stopSpeaking();
      const u = new SpeechSynthesisUtterance(s.ttsDua);
      u.lang = 'ar-SA';
      u.rate = spd * 0.85;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    }

    if (s.audio && audioRef.current) {
      // Audio step — advance on onended, use actual duration for countdown
      const fallbackDur = s.duration / spd;
      startCountdown(fallbackDur);

      audioRef.current.src = s.audio;
      audioRef.current.playbackRate = spd;

      audioRef.current.onloadedmetadata = () => {
        if (!autoPlayRef.current) return;
        const actualDur = audioRef.current.duration / spd;
        clearInterval(autoCountdownIntervalRef.current);
        startCountdown(actualDur);
      };

      audioRef.current.onended = () => {
        if (!autoPlayRef.current) return;
        advance();
      };

      audioRef.current.play()
        .then(() => { if (autoPlayRef.current) setIsPlaying(true); })
        .catch(() => {
          // Audio failed — fall through to timer
          autoStepTimerRef.current = setTimeout(advance, fallbackDur * 1000);
        });
    } else {
      // Timer step
      const durSecs = s.duration / spd;
      startCountdown(durSecs);
      autoStepTimerRef.current = setTimeout(advance, durSecs * 1000);
    }
  }

  /* ---- Manual mode controls ---- */
  function togglePlay() {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else if (step.audio && audioRef.current) {
      audioRef.current.src = step.audio;
      audioRef.current.playbackRate = speed;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }

  function next() {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  }

  function prev() {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentStep(Math.max(currentStep - 1, 0));
  }

  /* ---- Render ---- */
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <Headphones className="w-8 h-8 gold-text" />
        <div>
          <div className="font-display text-3xl">Guided Prayer</div>
          <div className="text-xs text-gold-dim">Follow along step by step</div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6 pb-6 border-b border-gold/20">
        <div>
          <label className="text-xs uppercase tracking-widest gold-text mb-2 block">Number of Rakats</label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => { setRakats(n); setCurrentStep(0); }}
                className={`py-2 rounded-sm border transition ${rakats === n ? 'bg-gold text-midnight border-gold font-semibold' : 'gold-border hover:bg-gold/10'}`}>
                {n} Rakat{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gold-dim mt-1">2 (Fajr/Sunnah/Nafl) · 3 (Maghrib/Witr) · 4 (Dhuhr/Asr/Isha fard)</div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest gold-text mb-2 block">Reciter (for Al-Fatiha & recitations)</label>
          <select value={reciter} onChange={e => setReciter(e.target.value)}
            className="w-full px-3 py-2 bg-midnight border gold-border rounded-sm focus:outline-none focus:border-gold">
            {RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest gold-text mb-2 flex items-center justify-between">
            <span>Playback Speed</span>
            <span className="gold-text tabular-nums">{speed.toFixed(2)}x</span>
          </label>
          <input type="range" min={0.5} max={1.5} step={0.05} value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            className="w-full" />
          <div className="flex justify-between text-[10px] text-gold-dim mt-1">
            <span>0.5x slower</span><span>1.0x normal</span><span>1.5x faster</span>
          </div>
        </div>

        {/* Auto-play launch button */}
        {!autoPlay && !prayerComplete && (
          <button onClick={startAutoPlay}
            className="w-full py-3 rounded-sm border-2 border-gold bg-gold/10 hover:bg-gold/20 transition flex items-center justify-center gap-2 font-semibold gold-text">
            <Zap className="w-4 h-4" />
            Start Auto-Play Prayer
          </button>
        )}
      </div>

      {/* Prayer complete state */}
      {prayerComplete && (
        <div className="mb-6 p-5 rounded-sm border border-gold bg-gold/10 text-center">
          <div className="font-arabic text-3xl gold-text mb-2">الحمد لله</div>
          <div className="font-display text-2xl mb-1">Prayer Complete</div>
          <div className="text-sm text-gold-dim mb-4">May Allah accept your prayer. Ameen.</div>
          <button onClick={() => { setPrayerComplete(false); setCurrentStep(0); }}
            className="px-6 py-2 rounded-sm bg-gold text-midnight font-semibold hover:bg-gold-bright transition">
            Pray Again
          </button>
        </div>
      )}

      {/* Step display */}
      {!prayerComplete && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest gold-text">Step {currentStep + 1} of {steps.length}</div>
            <div className="text-xs text-gold-dim">{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</div>
          </div>

          <div className="h-1 rounded bg-gold/10 mb-5 overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
          </div>

          <div className="p-5 rounded-sm border gold-border text-center" style={{ background: 'rgba(212,175,55,0.05)' }}>
            {/* Kid-friendly posture illustration */}
            <div className="mb-3">
              <Figure />
            </div>

            <div className="font-arabic text-4xl gold-text mb-2">{step.arabic}</div>
            <div className="font-display text-2xl mb-3">{step.phase}</div>
            <div className="text-sm leading-relaxed">{step.text}</div>
          </div>

          {/* Auto-play countdown bar */}
          {autoPlay && autoDuration > 0 && (
            <div className="mt-4 p-4 rounded-sm border border-gold/30 bg-gold/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm gold-text">
                  <Zap className="w-4 h-4" />
                  <span>Auto-playing</span>
                  {isPlaying && <span className="text-xs text-gold-dim">(recitation)</span>}
                </div>
                <span className="font-display text-xl tabular-nums gold-text">{autoCountdown}s</span>
              </div>
              <div className="h-1.5 rounded bg-gold/15 overflow-hidden">
                <div className="h-full bg-gold transition-all duration-1000"
                  style={{ width: `${autoDuration > 0 ? ((autoDuration - autoCountdown) / autoDuration) * 100 : 0}%` }} />
              </div>
              <button onClick={stopAutoPlay}
                className="mt-3 w-full py-2 rounded-sm border border-rose-500/60 bg-rose-900/30 text-rose-300 hover:bg-rose-900/50 transition flex items-center justify-center gap-2 text-sm font-semibold">
                <StopCircle className="w-4 h-4" /> Stop Auto-Play
              </button>
            </div>
          )}

          {/* Manual mode audio control */}
          {!autoPlay && step.audio && (
            <div className="mt-4 p-4 rounded-sm border border-gold/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Volume2 className="w-4 h-4 gold-text" />
                <span>Recitation available</span>
              </div>
              <button onClick={togglePlay}
                className="px-4 py-2 rounded-sm bg-gold text-midnight font-semibold flex items-center gap-2 hover:bg-gold-bright transition">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual navigation (hidden during auto-play) */}
      {!autoPlay && !prayerComplete && (
        <div className="flex gap-2">
          <button onClick={prev} disabled={currentStep === 0}
            className="flex-1 py-3 rounded-sm border gold-border hover:bg-gold/10 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Previous
          </button>
          <button onClick={next} disabled={currentStep === steps.length - 1}
            className="flex-1 py-3 rounded-sm bg-gold text-midnight font-semibold hover:bg-gold-bright transition disabled:opacity-50">
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      )}

      <div className="mt-4 text-[10px] text-gold-dim text-center italic">
        Steps follow the Sunnah as transmitted in Sahih al-Bukhari & Sahih Muslim. Minor variations exist between schools of jurisprudence.
      </div>
    </Modal>
  );
}

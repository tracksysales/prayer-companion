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

const FORTY_HADITH = [
  { number: 1, arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', english: 'Actions are judged by intentions, and every person will have what they intended. So whoever emigrated for Allah and His Messenger, his emigration was for Allah and His Messenger. And whoever emigrated for worldly gain or to marry a woman, then his emigration was for that which he emigrated.', source: 'Bukhari & Muslim' },
  { number: 2, arabic: 'الإِسْلَامُ أَنْ تَشْهَدَ أَنْ لَا إِلَهَ إِلَّا اللهُ', english: 'Islam is to testify that there is no deity except Allah and that Muhammad is the Messenger of Allah, to establish prayer, to pay zakat, to fast in Ramadan, and to make pilgrimage to the House if you are able to do so.', source: 'Muslim' },
  { number: 3, arabic: 'بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ', english: 'Islam is built upon five pillars: testifying that there is no deity except Allah and that Muhammad is the Messenger of Allah, establishing prayer, paying zakat, making pilgrimage to the House, and fasting in Ramadan.', source: 'Bukhari & Muslim' },
  { number: 4, arabic: 'لَا يَزْنِي الزَّانِي حِينَ يَزْنِي وَهُوَ مُؤْمِنٌ', english: 'One of you does not truly believe until he loves for his brother what he loves for himself.', source: 'Bukhari & Muslim' },
  { number: 5, arabic: 'مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ مِنْهُ فَهُوَ رَدٌّ', english: 'Whoever introduces into this affair of ours something that does not belong to it, it is rejected.', source: 'Bukhari & Muslim' },
  { number: 6, arabic: 'الْحَلَالُ بَيِّنٌ وَالْحَرَامُ بَيِّنٌ', english: 'The lawful is clear and the unlawful is clear, and between them are doubtful matters about which many people do not know. Whoever guards against doubtful things keeps his religion and his honor blameless.', source: 'Bukhari & Muslim' },
  { number: 7, arabic: 'الدِّينُ النَّصِيحَةُ', english: 'The religion is sincere good counsel. We said: For whom? He said: For Allah, His Book, His Messenger, the leaders of the Muslims, and their common people.', source: 'Muslim' },
  { number: 8, arabic: 'أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ', english: 'I have been commanded to fight people until they testify that there is no deity except Allah and that Muhammad is the Messenger of Allah, establish prayer, and pay zakat. If they do this, their blood and wealth are protected except by the right of Islam, and their final reckoning is with Allah.', source: 'Bukhari & Muslim' },
  { number: 9, arabic: 'مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ', english: 'Whatever I have forbidden for you, avoid it. Whatever I have commanded you, do as much of it as you can. Indeed, what destroyed those before you was excessive questioning and their disagreeing with their prophets.', source: 'Bukhari & Muslim' },
  { number: 10, arabic: 'إِنَّ اللَّهَ طَيِّبٌ لَا يَقْبَلُ إِلَّا طَيِّبًا', english: 'Allah is pure and only accepts what is pure. Allah has commanded the believers what He commanded the messengers: "O messengers, eat of the good things and do righteous deeds" (23:51). Then he mentioned a man who has traveled far, is disheveled and dusty, and raises his hands to the sky saying, "O Lord! O Lord!" while his food is unlawful, his drink is unlawful, his clothing is unlawful, and he is nourished by what is unlawful. How can his supplication be accepted?', source: 'Muslim' },
  { number: 11, arabic: 'دَعْ مَا يَرِيبُكَ إِلَى مَا لَا يَرِيبُكَ', english: 'Leave that which makes you doubt for that which does not make you doubt.', source: 'Tirmidhi & Nasai' },
  { number: 12, arabic: 'مِنْ حُسْنِ إِسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ', english: 'Part of the perfection of a person\'s Islam is leaving what does not concern him.', source: 'Tirmidhi' },
  { number: 13, arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', english: 'None of you truly believes until he loves for his brother what he loves for himself.', source: 'Bukhari & Muslim' },
  { number: 14, arabic: 'لَا يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ', english: 'The blood of a Muslim may not be spilled except in three cases: the married adulterer, a life for a life, and the one who leaves his religion and abandons the community.', source: 'Bukhari & Muslim' },
  { number: 15, arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ', english: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent. Whoever believes in Allah and the Last Day, let him honor his neighbor. Whoever believes in Allah and the Last Day, let him honor his guest.', source: 'Bukhari & Muslim' },
  { number: 16, arabic: 'لَا تَغْضَبْ وَلَكَ الْجَنَّةُ', english: 'Do not become angry — and Paradise is yours.', source: 'Tabarani (authenticated)' },
  { number: 17, arabic: 'إِنَّ اللَّهَ كَتَبَ الْإِحْسَانَ عَلَى كُلِّ شَيْءٍ', english: 'Verily Allah has prescribed excellence in all things. So when you kill, do so in a good manner; when you slaughter, do so in a good manner. Let each of you sharpen his blade, and spare suffering to the animal he slaughters.', source: 'Muslim' },
  { number: 18, arabic: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ', english: 'Fear Allah wherever you may be, follow up a bad deed with a good deed which will wipe it out, and behave well towards people.', source: 'Tirmidhi' },
  { number: 19, arabic: 'إِذَا أَحْسَنَ أَحَدُكُمْ إِسْلَامَهُ فَكُلُّ حَسَنَةٍ يَعْمَلُهَا تُكْتَبُ لَهُ', english: 'If someone improves his Islam, every good deed he does will be credited to him tenfold to seven hundredfold, and every bad deed will be recorded as it is.', source: 'Bukhari & Muslim' },
  { number: 20, arabic: 'إِنَّ مِنْ أَفْضَلِ أَيَّامِكُمْ يَوْمُ الْجُمُعَةِ', english: 'Be mindful of Allah and you will find Him in front of you. Know Allah in times of ease and He will know you in times of hardship. Know that what has passed you by was never meant to befall you, and what has befallen you was never meant to pass you by.', source: 'Tirmidhi' },
  { number: 21, arabic: 'قُلْ آمَنْتُ بِاللَّهِ ثُمَّ اسْتَقِمْ', english: 'Say: I believe in Allah, then remain steadfast.', source: 'Muslim' },
  { number: 22, arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يَكُونَ هَوَاهُ تَبَعًا لِمَا جِئْتُ بِهِ', english: 'None of you truly believes until his desires submit to what I have brought.', source: "Ibn Abi 'Asim" },
  { number: 23, arabic: 'الطَّهُورُ شَطْرُ الْإِيمَانِ', english: 'Purity is half of faith. Alhamdulillah fills the scales. SubhanAllah and Alhamdulillah fill up what is between the heavens and the earth. Prayer is a light, charity is evidence, patience is illumination, and the Quran is proof for you or against you.', source: 'Muslim' },
  { number: 24, arabic: 'يَا عِبَادِي إِنِّي حَرَّمْتُ الظُّلْمَ عَلَى نَفْسِي', english: 'O My servants, I have forbidden oppression for Myself and have made it forbidden amongst you, so do not oppress one another. O My servants, all of you are astray except for those I have guided, so seek guidance of Me and I shall guide you.', source: 'Muslim' },
  { number: 25, arabic: 'الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ', english: 'Charity extinguishes sin as water extinguishes fire.', source: 'Tirmidhi' },
  { number: 26, arabic: 'كُلُّ سُلَامَى مِنَ النَّاسِ عَلَيْهِ صَدَقَةٌ كُلَّ يَوْمٍ', english: 'Charity is due upon every joint of a person on every day that the sun rises. Doing justice between two people is charity. Helping a man with his animal, lifting his luggage or hoisting him up is charity. A good word is charity. Every step taken toward prayer is charity. Removing a harmful thing from the road is charity.', source: 'Bukhari & Muslim' },
  { number: 27, arabic: 'الْبِرُّ حُسْنُ الْخُلُقِ', english: 'Righteousness is good character, and sin is what wavers in your soul and you dislike people finding out about it.', source: 'Muslim' },
  { number: 28, arabic: 'عَلَيْكَ بِالصِّدْقِ فَإِنَّ الصِّدْقَ يَهْدِي إِلَى الْبِرِّ', english: 'Adhere to truthfulness, for truthfulness leads to righteousness and righteousness leads to Paradise. A person continues to be truthful and seeks to be truthful until he is recorded with Allah as a siddiq (truthful person). Beware of lying, for lying leads to wickedness and wickedness leads to the Fire.', source: 'Bukhari & Muslim' },
  { number: 29, arabic: 'مَنْ عَمِلَ مِنْكُمْ لَنَا عَمَلًا فَكَتَمَ مِنْهُ مِخْيَطًا فَمَا فَوْقَهُ فَهُوَ غُلُولٌ', english: 'Whoever practices patience, Allah will make him patient. Nobody can be given a blessing better and greater than patience.', source: 'Bukhari & Muslim' },
  { number: 30, arabic: 'إِنَّ اللَّهَ فَرَضَ فَرَائِضَ فَلَا تُضَيِّعُوهَا', english: 'Allah has set limits, so do not transgress them. He has prescribed obligations, so do not neglect them. He has forbidden things, so do not violate them. He has left some things unmentioned as mercy for you, not due to forgetfulness, so do not seek after them.', source: 'Daraqutni (authenticated)' },
  { number: 31, arabic: 'كُنْ فِي الدُّنْيَا كَأَنَّكَ غَرِيبٌ أَوْ عَابِرُ سَبِيلٍ', english: 'Be in this world as though you are a stranger or a wayfarer.', source: 'Bukhari' },
  { number: 32, arabic: 'لَا ضَرَرَ وَلَا ضِرَارَ', english: 'There should be neither harming nor reciprocating harm.', source: 'Ibn Majah & Daraqutni' },
  { number: 33, arabic: 'الْبَيِّنَةُ عَلَى مَنِ ادَّعَى وَالْيَمِينُ عَلَى مَنْ أَنْكَرَ', english: 'If people were given everything they claimed, men would claim the wealth and lives of others. The claimant must provide evidence, and the one who denies must swear an oath.', source: 'Bukhari & Muslim (reported)' },
  { number: 34, arabic: 'مَنْ رَأَى مِنْكُمْ مُنْكَرًا فَلْيُغَيِّرْهُ بِيَدِهِ', english: 'Whoever of you sees an evil, let him change it with his hand; and if he is not able, then with his tongue; and if he is not able, then with his heart — and that is the weakest of faith.', source: 'Muslim' },
  { number: 35, arabic: 'لَا تَحَاسَدُوا وَلَا تَنَاجَشُوا وَلَا تَبَاغَضُوا', english: 'Do not envy one another, do not artificially inflate prices against one another, do not hate one another, do not turn your backs on one another. Be, O servants of Allah, brothers. A Muslim is the brother of a Muslim — he does not oppress him, he does not fail him, he does not lie to him, and he does not despise him.', source: 'Muslim' },
  { number: 36, arabic: 'مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا', english: 'Whoever relieves a believer of a distress from the distresses of this world, Allah will relieve him of a distress from the distresses of the Day of Judgment. Whoever facilitates for one who is in difficulty, Allah will facilitate for him in this world and the Hereafter.', source: 'Muslim' },
  { number: 37, arabic: 'إِنَّ اللَّهَ كَتَبَ الْحَسَنَاتِ وَالسَّيِّئَاتِ', english: 'Allah has recorded good and bad deeds. Whoever intends a good deed and does not do it, Allah records it as a complete good deed. If he intends it and does it, Allah records it as ten good deeds up to seven hundred or more. If he intends a bad deed and does not do it, Allah records it as a complete good deed.', source: 'Bukhari & Muslim' },
  { number: 38, arabic: 'مَنْ عَادَى لِي وَلِيًّا فَقَدْ آذَنْتُهُ بِالْحَرْبِ', english: 'Allah said: Whoever takes a friend of Mine as an enemy, I declare war on him. My servant draws near to Me by nothing more beloved to Me than what I have prescribed for him. My servant continues to draw near to Me with voluntary acts until I love him.', source: 'Bukhari (Hadith Qudsi)' },
  { number: 39, arabic: 'إِنَّ اللَّهَ تَجَاوَزَ عَنْ أُمَّتِي الْخَطَأَ وَالنِّسْيَانَ', english: 'Allah has forgiven my ummah for their mistakes, forgetfulness, and what they are forced to do.', source: 'Ibn Majah (authenticated)' },
  { number: 40, arabic: 'كُنْ فِي الدُّنْيَا كَأَنَّكَ غَرِيبٌ أَوْ عَابِرُ سَبِيلٍ', english: 'Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your occupation, and your life before your death.', source: 'Hakim (authenticated)' },
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
  const [openQibla, setOpenQibla] = useState(false);
  const [openTasbih, setOpenTasbih] = useState(false);
  const [openAdhkar, setOpenAdhkar] = useState(null); // 'morning' | 'evening' | null
  const [openDuaLibrary, setOpenDuaLibrary] = useState(false);
  const [openMosques, setOpenMosques] = useState(false);
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

            {/* Today's Reflection */}
            <TodaysReflection />

            {/* Action cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
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

            <div className="mb-10">
              <h2 className="font-display text-2xl mb-4 gold-text tracking-wide">Tools</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setOpenQibla(true)}
                  className="p-5 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                  <div className="text-2xl mb-2">🧭</div>
                  <div className="font-display text-lg mb-1">Qibla</div>
                  <div className="text-xs text-gold-dim">Direction of prayer</div>
                </button>
                <button onClick={() => setOpenTasbih(true)}
                  className="p-5 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                  <div className="text-2xl mb-2">📿</div>
                  <div className="font-display text-lg mb-1">Tasbih</div>
                  <div className="text-xs text-gold-dim">Dhikr counter</div>
                </button>
                <button onClick={() => setOpenAdhkar('morning')}
                  className="p-5 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                  <div className="text-2xl mb-2">🌅</div>
                  <div className="font-display text-lg mb-1">Morning Adhkar</div>
                  <div className="text-xs text-gold-dim">After Fajr</div>
                </button>
                <button onClick={() => setOpenAdhkar('evening')}
                  className="p-5 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                  <div className="text-2xl mb-2">🌆</div>
                  <div className="font-display text-lg mb-1">Evening Adhkar</div>
                  <div className="text-xs text-gold-dim">After Asr</div>
                </button>
                <button onClick={() => setOpenDuaLibrary(true)}
                  className="p-5 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                  <div className="text-2xl mb-2">🤲</div>
                  <div className="font-display text-lg mb-1">Dua Library</div>
                  <div className="text-xs text-gold-dim">40+ duas by situation</div>
                </button>
                <button onClick={() => setOpenMosques(true)}
                  className="p-5 rounded-sm border gold-border text-left hover:bg-gold/5 transition">
                  <div className="text-2xl mb-2">🕌</div>
                  <div className="font-display text-lg mb-1">Nearby Mosques</div>
                  <div className="text-xs text-gold-dim">Find mosques near you</div>
                </button>
              </div>
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

        {openQibla && (
          <QiblaCompass location={location} onClose={() => setOpenQibla(false)} />
        )}

        {openTasbih && (
          <TasbihCounter onClose={() => setOpenTasbih(false)} times={times} />
        )}

        {openAdhkar && (
          <AdhkarModal mode={openAdhkar} onClose={() => setOpenAdhkar(null)} />
        )}

        {openDuaLibrary && (
          <DuaLibraryModal onClose={() => setOpenDuaLibrary(false)} />
        )}

        {openMosques && (
          <NearbyMosquesModal location={location} onClose={() => setOpenMosques(false)} />
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
   QIBLA COMPASS
   ============================================================ */

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calcQiblaAngle(lat, lon) {
  const kaabaLat = 21.4225;
  const kaabaLon = 39.8262;
  const dLon = (kaabaLon - lon) * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const kaabaLatRad = kaabaLat * Math.PI / 180;
  const y = Math.sin(dLon);
  const x = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(dLon);
  const angle = Math.atan2(y, x) * 180 / Math.PI;
  return (angle + 360) % 360;
}

/* ============================================================
   ADHKAR — Morning and Evening Remembrance (from Hisn al-Muslim)
   ============================================================ */

const MORNING_ADHKAR = [
  {
    id: 'ayat-kursi',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    translit: 'Allahu la ilaha illa huwal-Hayyul-Qayyum, la ta\'khudhuhu sinatun wa la nawm...',
    english: 'Ayat al-Kursi (Quran 2:255) — Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep...',
    count: 1,
    source: 'Hisn al-Muslim #7 — "Whoever recites this in the morning will be protected from jinn until evening" (Abu Dawud 3895)',
  },
  {
    id: 'three-quls',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    translit: 'Qul huwa Allahu ahad (Al-Ikhlas) · Qul a\'udhu bi-rabb il-falaq (Al-Falaq) · Qul a\'udhu bi-rabb in-nas (An-Nas)',
    english: 'Al-Ikhlas, Al-Falaq, and An-Nas — The three Quls. Each recited 3 times.',
    count: 3,
    source: 'Hisn al-Muslim #8 — recited 3 times each morning and evening (Abu Dawud 5082)',
  },
  {
    id: 'sayyid-istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    translit: 'Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana \'abduk, wa ana \'ala \'ahdika wa wa\'dika mastata\'t...',
    english: 'Sayyid al-Istighfar — O Allah, You are my Lord. There is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can...',
    count: 1,
    source: 'Hisn al-Muslim #11 — "Whoever says this with certainty in the morning and dies that day will enter Paradise" (Bukhari 6306)',
  },
  {
    id: 'subhan-100',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    translit: 'SubhanAllahi wa bihamdihi',
    english: 'Glory be to Allah and praise be to Him. Said 100 times — sins are forgiven even if they were like the foam of the sea.',
    count: 100,
    source: 'Hisn al-Muslim #12 — (Bukhari 6405, Muslim 2691)',
  },
  {
    id: 'asbahna',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    translit: 'Asbahna wa asbahal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah...',
    english: 'We have entered the morning and the entire dominion belongs to Allah. Praise be to Allah. There is no deity except Allah, alone without partner...',
    count: 1,
    source: 'Hisn al-Muslim #23 — (Abu Dawud 5077)',
  },
  {
    id: 'hasbiyallah-morning',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    translit: 'Hasbiyallahu la ilaha illa huwa, \'alayhi tawakkaltu wa huwa rabbul-\'arshil-\'azeem',
    english: 'Allah is sufficient for me. There is no deity except Him. Upon Him I rely, and He is the Lord of the Mighty Throne. Recited 7 times.',
    count: 7,
    source: 'Hisn al-Muslim #14 — "Allah will be sufficient for him in what concerns him" (Abu Dawud 5081)',
  },
  {
    id: 'la-ilaha-morning',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    translit: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa \'ala kulli shay\'in qadir',
    english: 'There is no deity except Allah, alone, without partner. His is the dominion and His is the praise, and He has power over all things. Recited 10 times.',
    count: 10,
    source: 'Hisn al-Muslim #16 — "Equivalent to freeing 4 slaves, 10 good deeds recorded, 10 sins erased" (Tirmidhi 3468)',
  },
  {
    id: 'allahumma-aafinee',
    arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',
    translit: 'Allahumma \'afini fi badani, Allahumma \'afini fi sam\'i, Allahumma \'afini fi basari',
    english: 'O Allah, grant me health in my body. O Allah, grant me health in my hearing. O Allah, grant me health in my sight. Recited 3 times.',
    count: 3,
    source: 'Hisn al-Muslim #22 — (Abu Dawud 5090)',
  },
  {
    id: 'ridha-morning',
    arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلَامِ دِيناً، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيهِ وَسَلَّم نَبِيًّا',
    translit: 'Raditu billahi rabba, wa bil-islami dina, wa bi-Muhammadin sallallahu \'alayhi wa sallam nabiyya',
    english: 'I am pleased with Allah as my Lord, Islam as my religion, and Muhammad as my prophet. Recited 3 times.',
    count: 3,
    source: 'Hisn al-Muslim #9 — "Allah will be pleased with him on the Day of Judgment" (Abu Dawud 5072, Tirmidhi 3389)',
  },
  {
    id: 'salawat-morning',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    translit: 'Allahumma salli wa sallim \'ala nabiyyina Muhammad',
    english: 'O Allah, send blessings and peace upon our Prophet Muhammad. Recited 10 times.',
    count: 10,
    source: 'Hisn al-Muslim — (Authenticated by al-Albani)',
  },
];

const EVENING_ADHKAR = [
  {
    id: 'ayat-kursi-eve',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    translit: 'Allahu la ilaha illa huwal-Hayyul-Qayyum...',
    english: 'Ayat al-Kursi (Quran 2:255) — Protection from jinn until the morning. Recited once.',
    count: 1,
    source: 'Hisn al-Muslim #7 — (Abu Dawud 3895)',
  },
  {
    id: 'three-quls-eve',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    translit: 'Qul huwa Allahu ahad · Qul a\'udhu bi-rabb il-falaq · Qul a\'udhu bi-rabb in-nas',
    english: 'Al-Ikhlas, Al-Falaq, An-Nas — The three Quls. Recited 3 times each evening.',
    count: 3,
    source: 'Hisn al-Muslim #8 — (Abu Dawud 5082)',
  },
  {
    id: 'amsayna',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    translit: 'Amsayna wa amsal-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah...',
    english: 'We have entered the evening and the entire dominion belongs to Allah. Praise be to Allah. There is no deity except Allah, alone without partner...',
    count: 1,
    source: 'Hisn al-Muslim #23 — (Abu Dawud 5077)',
  },
  {
    id: 'sayyid-eve',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ',
    translit: 'Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana \'abduk...',
    english: 'Sayyid al-Istighfar — O Allah, You are my Lord. There is no deity except You. You created me and I am Your servant...',
    count: 1,
    source: 'Hisn al-Muslim #11 — "Whoever says this in the evening with certainty and dies that night will enter Paradise" (Bukhari 6306)',
  },
  {
    id: 'allahumma-ma-amsa',
    arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ',
    translit: 'Allahumma ma amsa bi min ni\'matin aw bi-ahadin min khalqika fa-minka wahdaka la sharika lak...',
    english: 'O Allah, whatever blessing I or any of Your creation have received in the evening, it is from You alone, without partner. All praise and thanks are Yours.',
    count: 1,
    source: 'Hisn al-Muslim #24 — "Whoever says this in the evening has expressed gratitude for the day" (Abu Dawud 5073)',
  },
  {
    id: 'hasbiyallah-evening',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    translit: 'Hasbiyallahu la ilaha illa huwa, \'alayhi tawakkaltu wa huwa rabbul-\'arshil-\'azeem',
    english: 'Allah is sufficient for me. There is no deity except Him. Upon Him I rely. Recited 7 times.',
    count: 7,
    source: 'Hisn al-Muslim #14 — (Abu Dawud 5081)',
  },
  {
    id: 'subhan-100-eve',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    translit: 'SubhanAllahi wa bihamdihi',
    english: 'Glory be to Allah and praise be to Him. Recited 100 times — sins forgiven even if like the foam of the sea.',
    count: 100,
    source: 'Hisn al-Muslim #12 — (Bukhari 6405)',
  },
  {
    id: 'before-sleep',
    arabic: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
    translit: 'Bismika rabbi wada\'tu janbi, wa bika arfa\'uh, fa-in amsakta nafsi farhamha, wa in arsaltaha fahfazha bima tahfazu bihi \'ibadakas-salihin',
    english: 'In Your name, my Lord, I lay myself down; and in Your name, I rise. If You take my soul, have mercy on it; and if You release it, protect it as You protect Your righteous servants.',
    count: 1,
    source: 'Hisn al-Muslim #101 — Before sleep (Bukhari 6320)',
  },
  {
    id: 'kafirun-sleep',
    arabic: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ',
    translit: 'Qul ya ayyuhal-kafirun (Surah Al-Kafirun, full)',
    english: 'Recite Surah Al-Kafirun once — it is a declaration of freedom from shirk and brings protection at sleep.',
    count: 1,
    source: 'Hisn al-Muslim #102 — (Abu Dawud 5055, Tirmidhi 3403)',
  },
  {
    id: 'la-ilaha-evening',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    translit: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa \'ala kulli shay\'in qadir',
    english: 'There is no deity except Allah, alone, without partner. His is the dominion, His is the praise, and He has power over all things. Recited 10 times.',
    count: 10,
    source: 'Hisn al-Muslim #16 — (Tirmidhi 3468)',
  },
];

function AdhkarModal({ mode, onClose }) {
  const todayKey = new Date().toISOString().split('T')[0];
  const adhkar = mode === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;
  const [step, setStep] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [completedToday, setCompletedToday] = useLocalStorage(`pc_adhkar_${mode}_${todayKey}`, false);

  const current = adhkar[step];
  const isLastStep = step === adhkar.length - 1;
  const stepProgress = tapCount / current.count;
  const stepDone = tapCount >= current.count;

  function tap() {
    if (navigator.vibrate) navigator.vibrate(20);
    setTapCount(c => Math.min(c + 1, current.count));
  }

  function advance() {
    if (isLastStep) {
      setCompletedToday(true);
      onClose();
    } else {
      setStep(s => s + 1);
      setTapCount(0);
    }
  }

  function skipStep() {
    advance();
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl">{mode === 'morning' ? '🌅' : '🌆'}</div>
        <div>
          <div className="font-display text-3xl">{mode === 'morning' ? 'Morning Adhkar' : 'Evening Adhkar'}</div>
          <div className="text-xs text-gold-dim">
            {mode === 'morning' ? 'Adhkar al-Sabah — Recited after Fajr until sunrise' : 'Adhkar al-Masa — Recited after Asr until Maghrib'}
          </div>
        </div>
      </div>

      {completedToday && (
        <div className="mb-4 p-3 rounded-sm border border-gold/40 bg-gold/10 text-center text-sm gold-text">
          Completed today · Mashallah!
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gold-dim mb-1">
          <span>Dhikr {step + 1} of {adhkar.length}</span>
          <span>{Math.round((step / adhkar.length) * 100)}% of set complete</span>
        </div>
        <div className="h-1.5 rounded bg-gold/10 overflow-hidden">
          <div className="h-full bg-gold transition-all" style={{ width: `${((step) / adhkar.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Current dhikr card */}
      <div className="p-5 rounded-sm border gold-border mb-4" style={{ background: 'rgba(212,175,55,0.04)' }}>
        <div className="font-arabic text-2xl gold-text leading-loose mb-3">{current.arabic}</div>
        <div className="text-sm text-gold-dim italic mb-2">{current.translit}</div>
        <div className="text-sm leading-relaxed mb-3">{current.english}</div>
        <div className="text-[10px] text-gold-dim">{current.source}</div>
      </div>

      {/* TTS button */}
      {hasSpeechSynthesis && (
        <button onClick={() => speakArabic(current.arabic)}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-sm border gold-border hover:bg-gold/10 transition gold-text mb-4">
          Hear Arabic
        </button>
      )}

      {/* Count target */}
      <div className="text-center mb-4">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">
          {current.count === 1 ? 'Recite once' : `Recite ${current.count} times`}
        </div>

        {current.count > 1 && (
          <>
            {/* SVG progress ring */}
            <div className="flex justify-center mb-3">
              <div className="relative" style={{ width: 100, height: 100 }}>
                <svg width="100" height="100" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#d4af37"
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - stepProgress)}
                    style={{ transition: 'stroke-dashoffset 0.2s ease' }} />
                </svg>
                <button onClick={tap}
                  disabled={stepDone}
                  className={`absolute inset-2 rounded-full flex items-center justify-center transition ${stepDone ? 'bg-gold' : 'bg-gold/10 hover:bg-gold/25 active:scale-95'}`}>
                  <span className={`font-display text-2xl tabular-nums ${stepDone ? 'text-midnight' : 'gold-text'}`}>{tapCount}</span>
                </button>
              </div>
            </div>
            <div className="text-xs text-gold-dim">{tapCount} / {current.count}</div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mt-4">
        <button onClick={skipStep}
          className="flex-1 py-2.5 rounded-sm border gold-border hover:bg-gold/10 transition text-sm">
          Skip
        </button>
        <button onClick={advance}
          disabled={!stepDone && current.count > 1}
          className="flex-1 py-2.5 rounded-sm bg-gold text-midnight font-semibold hover:bg-gold-bright transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          {isLastStep ? 'Complete Set' : 'Next'}
        </button>
      </div>

      {current.count === 1 && (
        <div className="text-center mt-2 text-xs text-gold-dim">Tap Next when ready</div>
      )}
    </Modal>
  );
}

/* ============================================================
   DUA LIBRARY — Duas from Hisn al-Muslim, organized by situation
   ============================================================ */

const DUA_CATEGORIES = [
  'All', 'Daily Life', 'Morning/Evening', 'Protection', 'Difficult Times', 'Relationships', 'Special Occasions',
];

const DUA_LIBRARY = [
  // DAILY LIFE
  { id: 'd1', cat: 'Daily Life', situation: 'Before eating', arabic: 'بِسْمِ اللَّهِ', translit: 'Bismillah', translation: 'In the name of Allah.', source: 'Hisn al-Muslim #204', context: 'Say Bismillah before eating. If you forget at the beginning, say: Bismillahi fi awwalihi wa akhirih.' },
  { id: 'd2', cat: 'Daily Life', situation: 'After eating', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', translit: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah", translation: 'Praise be to Allah who fed me this and provided it for me without any power or strength on my part.', source: 'Hisn al-Muslim #205 — Abu Dawud 4023', context: 'Whoever says this after eating, his past sins will be forgiven.' },
  { id: 'd3', cat: 'Daily Life', situation: 'Entering home', arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا', translit: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Allahi rabbina tawakkalna", translation: 'In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we rely.', source: 'Hisn al-Muslim #183 — Abu Dawud 5096', context: 'Then greet those in the home with salaam.' },
  { id: 'd4', cat: 'Daily Life', situation: 'Leaving home', arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translit: "Bismillah, tawakkaltu 'ala Allah, wa la hawla wa la quwwata illa billah", translation: 'In the name of Allah, I place my trust in Allah, and there is no power or strength except with Allah.', source: 'Hisn al-Muslim #182 — Abu Dawud 5095', context: 'Upon leaving the home. It will be said: You are guided, defended, and protected.' },
  { id: 'd5', cat: 'Daily Life', situation: 'Before sleep', arabic: 'اللَّهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا', translit: 'Allahumma bismika amutu wa ahya', translation: 'O Allah, in Your name I die and I live.', source: 'Hisn al-Muslim #99 — Bukhari 6324', context: 'Recite upon lying down to sleep, on your right side.' },
  { id: 'd6', cat: 'Daily Life', situation: 'Upon waking', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', translit: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur", translation: 'Praise be to Allah who gave us life after death, and to Him is the Resurrection.', source: 'Hisn al-Muslim #21 — Bukhari 6325', context: 'The first words upon waking.' },
  { id: 'd7', cat: 'Daily Life', situation: 'Wearing new clothes', arabic: 'اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ', translit: "Allahumma lakal-hamd, anta kasawtaniyh, as'aluka min khayrihi wa khayri ma suni'a lah, wa a'udhu bika min sharrihi wa sharri ma suni'a lah", translation: 'O Allah, praise be to You. You clothed me with it. I ask You for its goodness and the goodness of what it was made for, and I seek refuge in You from its evil and the evil of what it was made for.', source: 'Hisn al-Muslim #191 — Abu Dawud 4020, Tirmidhi 1767', context: 'Said when wearing a new garment.' },
  { id: 'd8', cat: 'Daily Life', situation: 'Looking in the mirror', arabic: 'اللَّهُمَّ أَنْتَ حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي', translit: 'Allahumma anta hassanta khalqi fa-hassin khuluqi', translation: 'O Allah, just as You have made my physical form beautiful, make my character beautiful too.', source: 'Hisn al-Muslim #192 — Ahmad (authenticated)', context: 'Said when looking in the mirror.' },
  { id: 'd9', cat: 'Daily Life', situation: 'Riding a vehicle', arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ', translit: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun', translation: 'Glory be to He who has subjected this to us, and we were not capable of it (ourselves), and indeed to our Lord we shall return.', source: 'Hisn al-Muslim #193 — Quran 43:13-14', context: 'Said when mounting any vehicle or means of transport.' },
  { id: 'd10', cat: 'Daily Life', situation: 'Visiting the sick', arabic: 'لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ', translit: "La ba's, tahurun in sha'a Allah", translation: 'Do not worry, it is a purification, if Allah wills.', source: 'Hisn al-Muslim #148 — Bukhari 5656', context: 'Said to someone who is sick — illness expiates sins as a purification.' },
  { id: 'd11', cat: 'Daily Life', situation: 'Traveling', arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى', translit: "Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa, wa minal-'amali ma tarda", translation: 'O Allah, we ask You for righteousness and piety in this journey of ours, and for deeds which please You.', source: 'Hisn al-Muslim #196 — Muslim 1342', context: 'Dua for starting a journey.' },

  // MORNING/EVENING
  { id: 'me1', cat: 'Morning/Evening', situation: 'Morning protection', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ', translit: 'Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykan-nushur', translation: 'O Allah, by You we enter the morning and by You we enter the evening. By You we live and by You we die, and to You is the Resurrection.', source: 'Hisn al-Muslim #25 — Abu Dawud 5068', context: 'Morning: replace "amsayna" with "asbahna". Evening: replace "asbahna" with "amsayna".' },
  { id: 'me2', cat: 'Morning/Evening', situation: 'Evening protection', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', translit: "A'udhu bi-kalimatillahit-tammati min sharri ma khalaq", translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', source: 'Hisn al-Muslim #80 — Muslim 2709', context: 'Recited 3 times in the evening — whoever says it will not be harmed by any sting that night.' },

  // PROTECTION
  { id: 'p1', cat: 'Protection', situation: 'Entering bathroom', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ', translit: "Allahumma inni a'udhu bika minal-khubuthi wal-khaba'ith", translation: 'O Allah, I seek refuge in You from male and female devils.', source: 'Hisn al-Muslim #161 — Bukhari 142, Muslim 375', context: 'Said before entering the bathroom. Enter with left foot.' },
  { id: 'p2', cat: 'Protection', situation: 'Leaving bathroom', arabic: 'غُفْرَانَكَ', translit: 'Ghufranaka', translation: 'I seek Your forgiveness.', source: 'Hisn al-Muslim #162 — Abu Dawud 30, Tirmidhi 7', context: 'Said upon leaving the bathroom. Exit with right foot.' },
  { id: 'p3', cat: 'Protection', situation: 'During thunder', arabic: 'سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ', translit: "Subhanal-ladhi yusabbihur-ra'du bihamdihi", translation: 'Glory be to He Whom the thunder glorifies with His praise.', source: 'Hisn al-Muslim #78 — Muwatta Malik 1748 (authenticated)', context: 'Said when hearing thunder.' },
  { id: 'p4', cat: 'Protection', situation: 'Seeing something disliked', arabic: 'اللَّهُمَّ لَا يَأْتِي بِالْحَسَنَاتِ إِلَّا أَنْتَ وَلَا يَدْفَعُ السَّيِّئَاتِ إِلَّا أَنْتَ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translit: "Allahumma la ya'ti bil-hasanati illa anta, wa la yadfa'us-sayyi'ati illa ant, wa la hawla wa la quwwata illa billah", translation: 'O Allah, none brings good things except You, and none repels evil things except You, and there is no power or strength except with Allah.', source: 'Hisn al-Muslim #79', context: 'Said upon seeing something disliked.' },
  { id: 'p5', cat: 'Protection', situation: 'Seeing something you like', arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا', translit: "Allahumma sayyiban nafi'an", translation: 'O Allah, (make it) a beneficial rainfall.', source: 'Hisn al-Muslim #77 — Bukhari 1032', context: 'Said when seeing rain or something beautiful Allah has created.' },
  { id: 'p6', cat: 'Protection', situation: 'During strong wind', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا فِيهَا وَخَيْرَ مَا أُرْسِلَتْ بِهِ', translit: "Allahumma inni as'aluka khayriha wa khayra ma fiha wa khayra ma ursilat bih", translation: 'O Allah, I ask You for its good and the good within it and the good it was sent with, and I seek refuge in You from its evil.', source: 'Hisn al-Muslim #76 — Muslim 899', context: 'Said during strong wind.' },

  // DIFFICULT TIMES
  { id: 'dt1', cat: 'Difficult Times', situation: 'When worried or distressed', arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ', translit: "Allahumma inni 'abduk, ibnu 'abdik, ibnu amatik, nasiyati biyadik, madin fiyya hukmuk, 'adlun fiyya qada'uk...", translation: 'O Allah, I am Your servant, son of Your servant, son of Your handmaid. My forelock is in Your hand. Your judgement is forever executed upon me; Your decree over me is just. I ask You by every name belonging to You which You named Yourself, or revealed in Your book, or You taught to any of Your creation, or have preserved in the knowledge of the unseen with You, that You make the Quran the spring of my heart...', source: 'Hisn al-Muslim #119 — Ahmad 3712, authenticated', context: 'The Prophet said: "No one ever says this when afflicted except that Allah removes his distress and replaces it with joy and relief."' },
  { id: 'dt2', cat: 'Difficult Times', situation: 'When angry', arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', translit: "A'udhu billahi minash-shaytanir-rajeem", translation: 'I seek refuge in Allah from Satan, the accursed.', source: 'Hisn al-Muslim #143 — Bukhari 3282, Muslim 2610', context: 'Two men argued before the Prophet. One grew red with anger. The Prophet said: "I know a word which would remove his anger if he said it."' },
  { id: 'dt3', cat: 'Difficult Times', situation: 'When in pain', arabic: 'أَعُوذُ بِعِزَّةِ اللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ', translit: "A'udhu bi-'izzatillahi wa qudratihi min sharri ma ajidu wa uhadhir", translation: 'I seek refuge in the might of Allah and His power from the evil of what I experience and what I fear.', source: 'Hisn al-Muslim #130 — Muslim 2202', context: 'Place your hand on the area of pain and say this 7 times. The Prophet taught this to Uthman ibn Abi al-As (RA).' },
  { id: 'dt4', cat: 'Difficult Times', situation: 'When afraid', arabic: 'اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ', translit: "Allahumma inna naj'aluka fi nuhurihim wa na'udhu bika min shururihim", translation: 'O Allah, we place You before them and seek refuge in You from their evils.', source: 'Hisn al-Muslim #123 — Abu Dawud 1537', context: 'Said when fearing people or a group.' },
  { id: 'dt5', cat: 'Difficult Times', situation: 'When facing a difficult matter', arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلاً وَأَنْتَ تَجْعَلُ الْحَزَنَ إِذَا شِئْتَ سَهْلاً', translit: "Allahumma la sahla illa ma ja'altahu sahla, wa anta taj'alul-hazna idha shi'ta sahla", translation: 'O Allah, there is nothing easy except what You make easy, and You make the difficult, if You wish, easy.', source: 'Hisn al-Muslim #121 — Ibn Hibban (authenticated)', context: 'Said when confronting any difficulty or hardship.' },
  { id: 'dt6', cat: 'Difficult Times', situation: "Upon hearing of someone's death", arabic: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', translit: "Inna lillahi wa inna ilayhi raji'un", translation: 'Indeed, we belong to Allah, and indeed to Him we shall return.', source: 'Hisn al-Muslim #149 — Quran 2:156', context: 'The Quran says Allah bestows blessings and mercy on those who say this upon affliction.' },

  // RELATIONSHIPS
  { id: 'r1', cat: 'Relationships', situation: 'For parents', arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', translit: 'Rabbir-hamhuma kama rabbayani saghira', translation: 'My Lord, have mercy upon them as they raised me when I was small.', source: 'Hisn al-Muslim — Quran 17:24', context: 'From the Quran — the command to make this dua for parents.' },
  { id: 'r2', cat: 'Relationships', situation: 'For spouse', arabic: 'اللَّهُمَّ أَصْلِحْ لِي زَوْجِي وَأَصْلِحْنِي لَهُ', translit: 'Allahumma aslih li zawji wa aslihni lah', translation: 'O Allah, correct my spouse for me and correct me for my spouse.', source: 'Reported in authentic supplications', context: 'A dua for marital harmony and being the best spouse possible.' },
  { id: 'r3', cat: 'Relationships', situation: 'For children', arabic: 'رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ', translit: 'Rabbi hab li minas-salihin', translation: 'My Lord, grant me [a child] from among the righteous.', source: 'Hisn al-Muslim — Quran 37:100', context: 'The dua of Ibrahim (AS) for a righteous child.' },
  { id: 'r4', cat: 'Relationships', situation: 'For the deceased', arabic: 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ', translit: "Allahummaghfir lahu warhamhu wa 'afihi wa'fu 'anh", translation: 'O Allah, forgive him/her, have mercy on him/her, pardon him/her, and excuse him/her.', source: 'Hisn al-Muslim #164 — Muslim 963', context: 'Said for the deceased in the funeral prayer. One of the most comprehensive duas for the dead.' },

  // SPECIAL OCCASIONS
  { id: 's1', cat: 'Special Occasions', situation: 'Entering the mosque', arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', translit: 'Allahumaf-tah li abwaba rahmatik', translation: 'O Allah, open for me the gates of Your mercy.', source: 'Hisn al-Muslim #175 — Muslim 713', context: 'Enter with the right foot, and say "Bismillah was-salatu was-salam \'ala Rasulillah" before this.' },
  { id: 's2', cat: 'Special Occasions', situation: 'Leaving the mosque', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', translit: "Allahumma inni as'aluka min fadlik", translation: 'O Allah, I ask You from Your bounty.', source: 'Hisn al-Muslim #176 — Muslim 713', context: 'Exit with the left foot.' },
  { id: 's3', cat: 'Special Occasions', situation: 'After the adhan', arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ', translit: "Allahumma rabba hadhihid-da'watit-tammah was-salatil-qa'imah, ati Muhammadanil-wasilata wal-fadilah...", translation: 'O Allah, Lord of this perfect call and the prayer to be established, give Muhammad the right of intercession and superiority...', source: 'Hisn al-Muslim #18 — Bukhari 614', context: 'Said after hearing the adhan. The Prophet said his intercession becomes assured for whoever says this.' },
  { id: 's4', cat: 'Special Occasions', situation: 'For Laylatul Qadr', arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', translit: "Allahumma innaka 'afuwwun tuhibbul-'afwa fa'fu 'anni", translation: 'O Allah, You are forgiving and love forgiveness, so forgive me.', source: 'Hisn al-Muslim — Tirmidhi 3513', context: 'Aisha (RA) asked: If I knew it was Laylatul Qadr, what should I say? The Prophet taught her this dua.' },
  { id: 's5', cat: 'Special Occasions', situation: 'Breaking fast (Iftar)', arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ', translit: "Allahumma laka sumtu wa 'ala rizqika aftart", translation: 'O Allah, for You I fasted and upon Your provision I break my fast.', source: 'Hisn al-Muslim #115 — Abu Dawud 2358', context: 'Said at Iftar (breaking fast at Maghrib). At the moment of breaking fast the dua is not rejected.' },
  { id: 's6', cat: 'Special Occasions', situation: 'During Ramadan', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translit: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar", translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', source: 'Quran 2:201', context: 'Anas (RA) said the Prophet recited this dua more than any other supplication.' },
  { id: 's7', cat: 'Special Occasions', situation: 'Upon hearing adhan', arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', translit: "Ashhadu an la ilaha illallah wahdahu la sharika lah, wa anna Muhammadan 'abduhu wa rasuluh", translation: 'I testify that there is no deity except Allah, alone without partner, and that Muhammad is His servant and Messenger.', source: 'Hisn al-Muslim #17 — Muslim 386', context: "Repeat each phrase of the adhan after the muadhin, except during hayya 'alas-salah say: La hawla wa la quwwata illa billah." },
];

/* ============================================================
   NEARBY MOSQUES — Overpass API (OpenStreetMap)
   ============================================================ */

function NearbyMosquesModal({ location, onClose }) {
  const CACHE_KEY = 'pc_mosques_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const [mosques, setMosques] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(10000);

  useEffect(() => {
    if (location) loadMosques(radius);
  }, []); // eslint-disable-line

  async function loadMosques(searchRadius) {
    // Check cache
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL && cached.lat === location.lat && cached.lon === location.lon && cached.radius === searchRadius) {
        setMosques(cached.mosques);
        return;
      }
    } catch {}

    setLoading(true);
    setError(null);
    try {
      const query = `[out:json];node[amenity=place_of_worship][religion=muslim](around:${searchRadius},${location.lat},${location.lon});out;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Overpass API error');
      const data = await res.json();

      const results = (data.elements || [])
        .map(el => ({
          id: el.id,
          name: el.tags?.name || el.tags?.['name:en'] || 'Mosque',
          lat: el.lat,
          lon: el.lon,
          distance: haversineDistance(location.lat, location.lon, el.lat, el.lon),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

      setMosques(results);

      // Cache result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(), lat: location.lat, lon: location.lon, radius: searchRadius, mosques: results,
      }));
    } catch (e) {
      setError('Could not load mosques. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  function retry25km() {
    setRadius(25000);
    loadMosques(25000);
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">🕌</div>
        <div>
          <div className="font-display text-3xl">Nearby Mosques</div>
          <div className="text-xs text-gold-dim">Within {radius >= 25000 ? '25' : '10'} km of {location?.city}</div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-gold-dim text-sm">Searching for mosques...</div>
          <div className="mt-3 h-1 rounded bg-gold/20 overflow-hidden">
            <div className="h-full bg-gold animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-sm border border-rose-500/40 bg-rose-900/20 text-rose-300 text-sm text-center mb-4">
          {error}
          <button onClick={() => loadMosques(radius)} className="block mx-auto mt-2 text-xs underline">Try again</button>
        </div>
      )}

      {!loading && mosques !== null && mosques.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-3">🕌</div>
          <div className="text-sm text-gold-dim mb-4">No mosques found within {radius >= 25000 ? '25' : '10'} km.</div>
          {radius < 25000 && (
            <button onClick={retry25km}
              className="px-5 py-2 rounded-sm border-2 border-gold bg-gold/10 hover:bg-gold/20 transition gold-text font-semibold text-sm">
              Expand search to 25 km
            </button>
          )}
        </div>
      )}

      {!loading && mosques && mosques.length > 0 && (
        <>
          <div className="text-xs text-gold-dim mb-4">{mosques.length} mosque{mosques.length !== 1 ? 's' : ''} found</div>
          <div className="space-y-2">
            {mosques.map(m => (
              <div key={m.id} className="p-4 rounded-sm border gold-border flex items-center justify-between gap-3"
                style={{ background: 'rgba(212,175,55,0.03)' }}>
                <div className="min-w-0">
                  <div className="font-display text-base truncate">{m.name}</div>
                  <div className="text-xs text-gold-dim">
                    {m.distance < 1 ? `${Math.round(m.distance * 1000)} m` : `${m.distance.toFixed(1)} km`}
                    {' '}· {(m.distance * 0.621371).toFixed(1)} mi
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-3 py-1.5 rounded-sm border gold-border hover:bg-gold/10 transition gold-text text-xs font-semibold whitespace-nowrap">
                  Directions →
                </a>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[10px] text-gold-dim text-center">Data from OpenStreetMap via Overpass API · Cached 24h</div>
        </>
      )}
    </Modal>
  );
}

function DuaLibraryModal({ onClose }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filtered = DUA_LIBRARY.filter(d => {
    const matchesCat = activeCategory === 'All' || d.cat === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch = !q || d.situation.toLowerCase().includes(q) || d.translation.toLowerCase().includes(q) || d.arabic.includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🤲</div>
        <div>
          <div className="font-display text-3xl">Dua Library</div>
          <div className="text-xs text-gold-dim">Duas from Hisn al-Muslim, organized by situation</div>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search duas..."
        className="w-full px-4 py-2.5 mb-3 bg-transparent border gold-border rounded-sm text-cream placeholder-gold-dim/60 focus:outline-none focus:border-gold text-sm"
      />

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DUA_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs border transition ${activeCategory === cat ? 'bg-gold text-midnight border-gold font-semibold' : 'gold-border hover:bg-gold/10 gold-text'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="text-xs text-gold-dim mb-3">{filtered.length} duas found</div>

      {/* Dua list */}
      <div className="space-y-2">
        {filtered.map(d => (
          <div key={d.id} className="rounded-sm border gold-border overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              className="w-full p-4 text-left hover:bg-gold/5 transition flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gold-dim uppercase tracking-wider mb-0.5">{d.cat}</div>
                <div className="font-display text-base">{d.situation}</div>
              </div>
              <span className="text-gold-dim text-sm flex-shrink-0">{expanded === d.id ? '▲' : '▼'}</span>
            </button>
            {expanded === d.id && (
              <div className="px-4 pb-4 border-t border-gold/20 pt-3" style={{ background: 'rgba(212,175,55,0.03)' }}>
                <div className="font-arabic text-xl gold-text leading-loose mb-3">{d.arabic}</div>
                <div className="text-sm text-gold-dim italic mb-2">{d.translit}</div>
                <div className="text-sm leading-relaxed mb-3">{d.translation}</div>
                <div className="text-xs text-gold-dim mb-2 italic">{d.context}</div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-gold-dim">{d.source}</div>
                  {hasSpeechSynthesis && (
                    <button onClick={() => speakArabic(d.arabic)}
                      className="flex items-center gap-1 text-xs px-3 py-1 rounded-sm border gold-border hover:bg-gold/10 transition gold-text">
                      🔊 Hear Arabic
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-gold-dim py-8">No duas found for your search.</div>
        )}
      </div>
    </Modal>
  );
}

function QiblaCompass({ location, onClose }) {
  const [compassHeading, setCompassHeading] = useState(null);
  const [permissionState, setPermissionState] = useState('idle'); // idle | requesting | granted | denied | unsupported
  const [orientationSupported, setOrientationSupported] = useState(false);

  const qiblaAngle = location ? calcQiblaAngle(location.lat, location.lon) : 0;
  const distanceKm = location ? haversineDistance(location.lat, location.lon, 21.4225, 39.8262) : 0;

  const needleRotation = compassHeading !== null ? (qiblaAngle - compassHeading + 360) % 360 : qiblaAngle;

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setOrientationSupported(false);
      return;
    }
    setOrientationSupported(true);
  }, []);

  async function requestOrientation() {
    setPermissionState('requesting');
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') {
          setPermissionState('granted');
          startListening();
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      }
    } else {
      setPermissionState('granted');
      startListening();
    }
  }

  function startListening() {
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
  }

  function handleOrientation(e) {
    let heading = null;
    if (e.webkitCompassHeading !== undefined) {
      heading = e.webkitCompassHeading;
    } else if (e.absolute && e.alpha !== null) {
      heading = (360 - e.alpha) % 360;
    } else if (e.alpha !== null) {
      heading = (360 - e.alpha) % 360;
    }
    if (heading !== null) setCompassHeading(heading);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []); // eslint-disable-line

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">🧭</div>
        <div>
          <div className="font-display text-3xl">Qibla Direction</div>
          <div className="text-xs text-gold-dim">Direction of the Kaaba, Makkah</div>
        </div>
      </div>

      <div className="text-center mb-6 p-3 rounded-sm border border-gold/20 bg-gold/5">
        <div className="text-xs uppercase tracking-widest gold-text mb-1">Distance to Kaaba</div>
        <div className="font-display text-2xl">{distanceKm.toFixed(0)} km · {(distanceKm * 0.621371).toFixed(0)} mi</div>
        <div className="text-xs text-gold-dim mt-1">from {location?.city}</div>
      </div>

      <div className="flex justify-center mb-6">
        <svg viewBox="0 0 200 200" width="220" height="220" className="mx-auto">
          <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="2" />
          <circle cx="100" cy="100" r="85" fill="rgba(212,175,55,0.04)" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
          <text x="100" y="18" textAnchor="middle" fill="#d4af37" fontSize="12" fontFamily="Outfit,sans-serif" fontWeight="600">N</text>
          <text x="188" y="104" textAnchor="middle" fill="rgba(212,175,55,0.6)" fontSize="11" fontFamily="Outfit,sans-serif">E</text>
          <text x="100" y="196" textAnchor="middle" fill="rgba(212,175,55,0.6)" fontSize="11" fontFamily="Outfit,sans-serif">S</text>
          <text x="12" y="104" textAnchor="middle" fill="rgba(212,175,55,0.6)" fontSize="11" fontFamily="Outfit,sans-serif">W</text>
          {Array.from({length: 36}, (_, i) => {
            const angle = i * 10 * Math.PI / 180;
            const isMajor = i % 9 === 0;
            const r1 = isMajor ? 82 : 86;
            const r2 = 90;
            return (
              <line key={i}
                x1={100 + r1*Math.sin(angle)} y1={100 - r1*Math.cos(angle)}
                x2={100 + r2*Math.sin(angle)} y2={100 - r2*Math.cos(angle)}
                stroke={isMajor ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.2)"} strokeWidth={isMajor ? 1.5 : 0.8} />
            );
          })}
          <g transform={`rotate(${needleRotation}, 100, 100)`} style={{ transition: compassHeading !== null ? 'transform 0.3s ease' : 'none' }}>
            <polygon points="100,25 106,100 100,110 94,100" fill="#d4af37" opacity="0.95" />
            <polygon points="100,175 106,100 100,110 94,100" fill="rgba(212,175,55,0.2)" />
            <circle cx="100" cy="100" r="6" fill="#d4af37" />
            <circle cx="100" cy="100" r="3" fill="#0a1628" />
          </g>
          <g transform={`rotate(${needleRotation}, 100, 100)`}>
            <rect x="88" y="10" width="24" height="14" rx="2" fill="#0a1628" stroke="#d4af37" strokeWidth="1.5" />
            <rect x="93" y="13" width="14" height="11" rx="1" fill="#1a2744" stroke="rgba(212,175,55,0.5)" strokeWidth="0.8" />
            <text x="100" y="21.5" textAnchor="middle" fontSize="6" fill="#d4af37" fontFamily="serif">الكعبة</text>
          </g>
        </svg>
      </div>

      <div className="text-center mb-6">
        <div className="font-display text-4xl gold-text">{Math.round(qiblaAngle)}°</div>
        <div className="text-sm text-gold-dim">from North (clockwise)</div>
      </div>

      {orientationSupported && permissionState === 'idle' && (
        <button onClick={requestOrientation}
          className="w-full py-3 rounded-sm border-2 border-gold bg-gold/10 hover:bg-gold/20 transition font-semibold gold-text mb-4">
          Enable Live Compass (rotate phone)
        </button>
      )}
      {permissionState === 'requesting' && (
        <div className="text-center text-sm text-gold-dim mb-4">Requesting compass permission...</div>
      )}
      {permissionState === 'granted' && compassHeading !== null && (
        <div className="text-center p-3 rounded-sm border border-gold/30 bg-gold/5 mb-4">
          <div className="text-xs uppercase tracking-widest gold-text mb-1">Live Compass Active</div>
          <div className="text-sm">Device heading: {Math.round(compassHeading)}° · Qibla: {Math.round(qiblaAngle)}°</div>
        </div>
      )}
      {permissionState === 'denied' && (
        <div className="text-center text-sm text-gold-dim mb-4">
          Compass permission denied. The needle shows the static Qibla bearing from North.
        </div>
      )}
      {!orientationSupported && (
        <div className="text-center text-xs text-gold-dim mb-4">
          Device orientation not available on this device. The compass shows the calculated Qibla bearing from North.
        </div>
      )}

      <div className="text-[10px] text-gold-dim text-center italic mt-2">
        Qibla direction calculated using haversine formula from your location to the Kaaba, Makkah (21.4225°N, 39.8262°E).
      </div>
    </Modal>
  );
}

/* ============================================================
   TASBIH COUNTER
   ============================================================ */

const DHIKR_PRESETS = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', translit: 'SubhanAllah', meaning: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', translit: 'Alhamdulillah', meaning: 'All praise is for Allah', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', translit: 'Allahu Akbar', meaning: 'Allah is the Greatest', target: 34 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', translit: 'Astaghfirullah', meaning: 'I seek forgiveness from Allah', target: 100 },
  { id: 'lailaha', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', translit: 'La ilaha illa Allah', meaning: 'There is no god but Allah', target: 100 },
  { id: 'salawat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّد', translit: 'Allahumma salli ala Muhammad', meaning: 'O Allah, send blessings on Muhammad', target: 10 },
];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* ============================================================
   TODAY'S REFLECTION — Daily Verse + Hadith
   ============================================================ */

function TodaysReflection() {
  const todayKey = new Date().toISOString().split('T')[0];
  const [verse, setVerse] = useLocalStorage('pc_daily_verse', null);
  const [verseDateKey, setVerseDateKey] = useLocalStorage('pc_verse_date', '');
  const [verseLoading, setVerseLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Select today's hadith by day-of-year
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const hadith = FORTY_HADITH[(dayOfYear - 1) % FORTY_HADITH.length];

  useEffect(() => {
    if (verseDateKey !== todayKey || !verse) {
      fetchVerse();
    }
  }, []); // eslint-disable-line

  async function fetchVerse() {
    setVerseLoading(true);
    try {
      const res = await fetch('https://api.quran.com/api/v4/verses/random?language=en&words=true&translations=131&fields=text_uthmani,chapter_id,verse_number');
      const data = await res.json();
      const v = data.verse;
      if (!v) throw new Error('No verse');
      const chapterId = v.chapter_id;
      const verseNum = v.verse_number;
      const arabic = v.text_uthmani;
      const english = v.translations?.[0]?.text?.replace(/<[^>]+>/g, '') || '';
      // Build audio URL from everyayah.com
      const chStr = String(chapterId).padStart(3, '0');
      const vStr = String(verseNum).padStart(3, '0');
      const audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${chStr}${vStr}.mp3`;
      const surahNames = ['Al-Fatihah','Al-Baqarah','Ali \'Imran','An-Nisa','Al-Maidah','Al-An\'am','Al-A\'raf','Al-Anfal','At-Tawbah','Yunus','Hud','Yusuf','Ar-Ra\'d','Ibrahim','Al-Hijr','An-Nahl','Al-Isra','Al-Kahf','Maryam','Ta-Ha','Al-Anbiya','Al-Hajj','Al-Mu\'minun','An-Nur','Al-Furqan','Ash-Shu\'ara','An-Naml','Al-Qasas','Al-\'Ankabut','Ar-Rum','Luqman','As-Sajdah','Al-Ahzab','Saba','Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura','Az-Zukhruf','Ad-Dukhan','Al-Jathiyah','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf','Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqiah','Al-Hadid','Al-Mujadila','Al-Hashr','Al-Mumtahanah','As-Saf','Al-Jumu\'ah','Al-Munafiqun','At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqah','Al-Ma\'arij','Nuh','Al-Jinn','Al-Muzzammil','Al-Muddaththir','Al-Qiyamah','Al-Insan','Al-Mursalat','An-Naba','An-Nazi\'at','Abasa','At-Takwir','Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq','Al-A\'la','Al-Ghashiyah','Al-Fajr','Al-Balad','Ash-Shams','Al-Layl','Ad-Duha','Ash-Sharh','At-Tin','Al-\'Alaq','Al-Qadr','Al-Bayyinah','Az-Zalzalah','Al-\'Adiyat','Al-Qari\'ah','At-Takathur','Al-\'Asr','Al-Humazah','Al-Fil','Quraysh','Al-Ma\'un','Al-Kawthar','Al-Kafirun','An-Nasr','Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas'];
      const surahName = surahNames[chapterId - 1] || `Surah ${chapterId}`;
      const newVerse = { arabic, english, citation: `${surahName} ${chapterId}:${verseNum}`, audioUrl };
      setVerse(newVerse);
      setVerseDateKey(todayKey);
    } catch {
      // silently fail — keep old verse if cached
    } finally {
      setVerseLoading(false);
    }
  }

  function toggleAudio() {
    if (!audioRef.current || !verse?.audioUrl) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.src = verse.audioUrl;
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false));
    }
  }

  return (
    <div className="mb-10 fade-in">
      <h2 className="font-display text-3xl mb-2 gold-text">Today's Reflection</h2>
      <p className="text-sm text-gold-dim mb-6 italic">A verse and hadith to carry through the day.</p>
      <audio ref={audioRef} onEnded={() => setAudioPlaying(false)} preload="none" />
      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily Verse */}
        <div className="p-6 rounded-sm border gold-border" style={{ background: 'rgba(212,175,55,0.04)' }}>
          <div className="text-xs uppercase tracking-widest gold-text mb-3">Daily Verse</div>
          {verseLoading && <div className="text-sm text-gold-dim">Loading verse...</div>}
          {verse && !verseLoading && (
            <>
              <div className="font-arabic text-xl gold-text mb-3 leading-loose">{verse.arabic}</div>
              <div className="text-sm leading-relaxed mb-3">{verse.english}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gold-dim">— {verse.citation}</div>
                {verse.audioUrl && (
                  <button onClick={toggleAudio}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-sm border gold-border hover:bg-gold/10 transition gold-text">
                    {audioPlaying ? '⏸ Pause' : '▶ Listen'}
                  </button>
                )}
              </div>
            </>
          )}
          {!verse && !verseLoading && (
            <button onClick={fetchVerse} className="text-sm gold-text hover:underline">Load today's verse</button>
          )}
        </div>

        {/* Daily Hadith */}
        <div className="p-6 rounded-sm border gold-border" style={{ background: 'rgba(212,175,55,0.04)' }}>
          <div className="text-xs uppercase tracking-widest gold-text mb-3">Hadith #{hadith.number}</div>
          <div className="font-arabic text-lg gold-text mb-3 leading-loose">{hadith.arabic}</div>
          <div className="text-sm leading-relaxed mb-3">{hadith.english}</div>
          <div className="text-xs text-gold-dim">— An-Nawawi's Forty Hadith · {hadith.source}</div>
          {hasSpeechSynthesis && (
            <button onClick={() => speakArabic(hadith.arabic)}
              className="mt-3 flex items-center gap-1 text-xs px-3 py-1 rounded-sm border gold-border hover:bg-gold/10 transition gold-text">
              🔊 Hear Arabic
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TasbihCounter({ onClose, times }) {
  const [selectedId, setSelectedId] = useState('subhanallah');
  const [customTarget, setCustomTarget] = useState(33);
  const [isCustom, setIsCustom] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const todayKey = getTodayKey();

  // Counts stored per dhikr per day: { 'subhanallah_2024-1-15': 12, ... }
  const [counts, setCounts] = useLocalStorage('pc_tasbih_counts', {});
  const [lifetimeTotal, setLifetimeTotal] = useLocalStorage('pc_tasbih_lifetime', 0);

  const dhikr = isCustom
    ? { id: 'custom', arabic: '', translit: 'Custom Dhikr', meaning: 'Your personal dhikr', target: customTarget }
    : DHIKR_PRESETS.find(d => d.id === selectedId);

  const countKey = `${dhikr.id}_${todayKey}`;
  const currentCount = counts[countKey] || 0;
  const todayTotal = Object.entries(counts)
    .filter(([k]) => k.endsWith(todayKey))
    .reduce((sum, [, v]) => sum + v, 0);

  const target = dhikr.target;
  const progress = Math.min(currentCount / target, 1);
  const isComplete = currentCount >= target;

  // SVG ring params
  const R = 54;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference * (1 - progress);

  function tap() {
    if (navigator.vibrate) navigator.vibrate(30);
    const newCount = currentCount + 1;
    setCounts(prev => ({ ...prev, [countKey]: newCount }));
    setLifetimeTotal(prev => prev + 1);
    setPulse(true);
    setTimeout(() => setPulse(false), 150);
    if (newCount === target) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 2000);
    }
  }

  function resetConfirm() {
    if (window.confirm(`Reset count for ${dhikr.translit}?`)) {
      setCounts(prev => ({ ...prev, [countKey]: 0 }));
      setJustCompleted(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">📿</div>
        <div>
          <div className="font-display text-3xl">Tasbih</div>
          <div className="text-xs text-gold-dim">Dhikr counter · Counts reset daily</div>
        </div>
      </div>

      {/* Dhikr selector */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest gold-text mb-2">Select Dhikr</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {DHIKR_PRESETS.map(d => (
            <button key={d.id} onClick={() => { setSelectedId(d.id); setIsCustom(false); setJustCompleted(false); }}
              className={`p-2 rounded-sm border text-left text-xs transition ${selectedId === d.id && !isCustom ? 'bg-gold text-midnight border-gold font-semibold' : 'gold-border hover:bg-gold/10'}`}>
              <div className="font-arabic text-sm">{d.arabic}</div>
              <div className="text-[10px]">{d.translit} · {d.target}</div>
            </button>
          ))}
          <button onClick={() => { setIsCustom(true); setJustCompleted(false); }}
            className={`p-2 rounded-sm border text-xs transition ${isCustom ? 'bg-gold text-midnight border-gold font-semibold' : 'gold-border hover:bg-gold/10'}`}>
            <div className="font-display text-sm">Custom</div>
            <div className="text-[10px]">Set your own target</div>
          </button>
        </div>
        {isCustom && (
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs text-gold-dim">Target:</label>
            <input type="number" min={1} max={999} value={customTarget}
              onChange={e => setCustomTarget(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-2 py-1 bg-transparent border gold-border rounded-sm text-center text-sm focus:outline-none focus:border-gold" />
          </div>
        )}
      </div>

      {/* Current dhikr display */}
      <div className="text-center mb-6">
        {dhikr.arabic && <div className="font-arabic text-3xl gold-text mb-1">{dhikr.arabic}</div>}
        <div className="font-display text-lg">{dhikr.translit}</div>
        <div className="text-xs text-gold-dim italic">{dhikr.meaning}</div>
      </div>

      {/* Progress ring + tap button */}
      <div className="flex justify-center mb-4">
        <div className="relative" style={{ width: 160, height: 160 }}>
          {/* SVG progress ring */}
          <svg width="160" height="160" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="8" />
            <circle cx="80" cy="80" r={R} fill="none" stroke="#d4af37"
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
          </svg>
          {/* Tap button */}
          <button onClick={tap}
            className={`absolute inset-3 rounded-full flex flex-col items-center justify-center transition-transform active:scale-95 ${pulse ? 'scale-95' : 'scale-100'} ${justCompleted ? 'bg-gold' : 'bg-gold/10 hover:bg-gold/20'}`}
            style={{ border: `2px solid ${isComplete ? '#d4af37' : 'rgba(212,175,55,0.3)'}` }}>
            <div className={`font-display text-4xl tabular-nums ${justCompleted ? 'text-midnight' : 'gold-text'}`}>
              {currentCount}
            </div>
            {justCompleted && <div className="text-midnight text-[10px] font-semibold uppercase tracking-wider">Complete!</div>}
          </button>
        </div>
      </div>

      {/* Progress text */}
      <div className="text-center mb-6">
        <div className="text-sm text-gold-dim">{currentCount} of {target}</div>
        {isComplete && !justCompleted && (
          <div className="text-xs gold-text mt-1">Target reached · Tap to continue</div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-sm border gold-border text-center">
          <div className="text-xs uppercase tracking-widest gold-text mb-1">Today Total</div>
          <div className="font-display text-2xl">{todayTotal}</div>
        </div>
        <div className="p-3 rounded-sm border gold-border text-center">
          <div className="text-xs uppercase tracking-widest gold-text mb-1">Lifetime</div>
          <div className="font-display text-2xl">{lifetimeTotal}</div>
        </div>
      </div>

      <button onClick={resetConfirm}
        className="w-full py-2 rounded-sm border border-rose-500/40 bg-rose-900/20 text-rose-300 hover:bg-rose-900/40 transition text-sm">
        Reset Current Count
      </button>
    </Modal>
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

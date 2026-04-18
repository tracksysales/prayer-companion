# Prayer Companion

A real-time Muslim prayer webapp with adhan playback, guided prayers, authentic duas, and Istikharah. Built with Vite + React, styled with Tailwind, deployable as a PWA.

## Features

- **Live prayer times** via the free [AlAdhan API](https://aladhan.com/prayer-times-api), auto-updating daily and adjusting with the seasons
- **Cycling adhans** — 7 public recordings rotate per prayer; Fajr includes *"prayer is better than sleep"*
- **Guided prayer** walkthrough for 2 / 3 / 4 rakats, with speed control (0.5x–1.5x) and 6 reciters
- **Mood-based duas** for 9 emotional states — all sourced from Sahih collections
- **Istikharah** — full method, dua, Arabic, transliteration, and English
- **Prayer details** with Fard/Sunnah/Nafl counts and historical context
- **Wake Lock + Notifications** so the adhan plays when the device is idle
- **PWA** — installs as an app on phones/desktops, works offline after first load

## Stack

- Vite 5 + React 18
- Tailwind CSS 3
- `vite-plugin-pwa` for service worker + manifest
- `lucide-react` for icons
- Google Fonts: Cormorant Garamond (display), Amiri (Arabic), Outfit (body)
- AlAdhan API (prayer times) + BigDataCloud (reverse geocoding)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

### Option 1 — Vercel CLI (fastest)

```bash
npm i -g vercel
vercel       # follow prompts, confirm project root
vercel --prod
```

### Option 2 — Git + Vercel dashboard

1. Push this folder to a new GitHub repo
2. On vercel.com → New Project → import the repo
3. Framework preset: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

Vercel gives you HTTPS automatically, which is required for:
- `navigator.geolocation`
- `Notification.requestPermission()`
- `navigator.wakeLock`
- Service workers (PWA install)

Without HTTPS these features silently fail, so local-network URLs (like `http://192.168...`) won't work for full functionality. Use `localhost` for dev and your Vercel URL for everything else.

## Customization points

- **Default calculation method**: `src/App.jsx` → `useLocalStorage('pc_method', 2)` — change `2` (ISNA) to any id from `CALC_METHODS`
- **Adhan library**: `ADHAN_LIBRARY` array — add/replace MP3 URLs
- **Reciters**: `RECITERS` array — CDN URLs from mp3quran.net
- **Moods/duas**: `MOOD_DUAS` object — add new entries with the same shape

## Privacy

This app runs entirely in the browser. No backend, no analytics, no tracking. Your location is only used to call the AlAdhan API for prayer times; nothing is sent anywhere else.

## Content sources

- Prayer information: Sahih al-Bukhari, Sahih Muslim, Sunan Abu Dawud
- Duas: Hisn al-Muslim (Fortress of the Muslim), referenced hadith collections
- Audio: publicly hosted adhan recordings (islamcan.com) and Quran recitations (mp3quran.net, everyayah.com)

If any audio host becomes unavailable, replace the URLs in the arrays at the top of `App.jsx`.

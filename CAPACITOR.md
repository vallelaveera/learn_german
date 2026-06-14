# Capacitor Android

## Setup

```bash
npm install
npm run cap:sync          # sync web assets + plugins
npm run cap:android       # open Android Studio
```

## Production WebView URL

Set your Vercel URL before syncing:

```bash
# Windows PowerShell
$env:CAPACITOR_SERVER_URL="https://your-app.vercel.app"
npm run cap:sync

# macOS/Linux
CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run cap:sync
```

## Icons & splash

Generated from `public/icon.svg`:

```bash
npm run cap:assets
```

Creates launcher icons (mdpi–xxxhdpi) and splash screens under `android/app/src/main/res/`.

## Local dev on device/emulator

```bash
npm run dev
# Android emulator → host machine:
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"
npm run cap:sync
npm run cap:run:android
```

# Deutsch Tutor 🇩🇪

Live German conversation practice with AI tutor Felix — powered by Soniox STT/TTS and Claude.

## Features

- 🎙️ **Real-time speech-to-text** via Soniox WebSocket API
- 🗣️ **Natural German TTS** via Soniox (German female voice)
- 🤖 **AI German tutor "Felix"** powered by Claude (B1/B2 level)
- 💡 **Grammar hints** inline after each assistant turn
- 📚 **Conversation history** stored in Vercel KV — review past sessions anytime

---

## Deploy to Vercel (recommended)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
gh repo create deutsch-tutor --public --push
```

Or create a repo on github.com and push.

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)

### 3. Add Vercel KV Storage

In your Vercel project dashboard:
1. Go to **Storage** tab → **Create Database** → **KV**
2. Name it `deutsch-tutor-kv`, click **Create & Connect**
3. Vercel auto-adds all `KV_*` env vars to your project

### 4. Add Environment Variables

In Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `SONIOX_API_KEY` | Your Soniox API key from [console.soniox.com](https://console.soniox.com) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SONIOX_API_KEY` | Same Soniox key (needed client-side for WebSocket) |

> ⚠️ `NEXT_PUBLIC_SONIOX_API_KEY` is exposed to the browser for the WebSocket connection.
> This is acceptable for personal use. For production with multiple users, proxy the STT
> WebSocket through your server as well.

### 5. Deploy

```bash
git push
```

Vercel auto-deploys. Your app is live! 🎉

---

## Run locally

```bash
npm install
cp .env.local .env.local.bak  # already has template

# Fill in your keys in .env.local:
# SONIOX_API_KEY=...
# ANTHROPIC_API_KEY=...
# NEXT_PUBLIC_SONIOX_API_KEY=...
# KV_* vars — get from Vercel KV dashboard or use @vercel/kv local dev mode

npm run dev
# Open http://localhost:3000
```

For local KV, see [Vercel KV local development docs](https://vercel.com/docs/storage/vercel-kv/quickstart).

---

## How it works

```
Browser mic → MediaRecorder (WebM audio)
    → Soniox STT WebSocket (direct from browser)
    → transcript text
    → POST /api/chat (Claude tutor)
    → German reply + grammar hint
    → POST /api/tts (Soniox TTS proxy)
    → MP3 audio → play in browser
    → save to Vercel KV on demand
```

---

## Customization

- **Change German level**: Edit `lib/tutor-prompt.ts` — change "B1/B2" and topic guidance
- **Change voice**: Edit `app/api/tts/route.ts` — update `voice` field (see Soniox voice list)
- **Auto-save**: Change `saveSession()` call in `app/call/page.tsx` to trigger automatically on call end
- **Add audio recording**: Use `MediaRecorder` to save the raw audio blob alongside the transcript in KV

---

## Tech stack

- **Next.js 14** (App Router)
- **Soniox** — STT (`stt-rt-v4` model, real-time WebSocket) + TTS (REST)
- **Claude** (`claude-sonnet-4`) — German tutor AI
- **Vercel KV** — conversation storage (Redis-based)
- **TypeScript**

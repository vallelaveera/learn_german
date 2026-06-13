# CallMeDaily — Critical Rules
## Never break these without updating this file first.

---

## SpeechRecorder.tsx

| Rule | Why |
|------|-----|
| `enable_endpoint_detection: true` | Soniox uses this to detect sentence end and fire `finished` |
| `stop()` must NOT set `endFiredRef = true` | It blocks the real `finished` signal from Soniox |
| `stop()` keeps WebSocket open 2000ms | Soniox sends `finished` AFTER audio ends — needs time |
| `onEnd()` only fires via `res.finished` | Single trigger point — no duplicates |

---

## app/call/page.tsx

| Rule | Why |
|------|-----|
| `_isSending = false` on every new recording start | Prevents stuck state from previous session |
| `finalBufferRef.current = ""` on every new recording start | Prevents old text leaking into new message |
| `_isSending = false` in catch block of sendToTutor | Unblocks recording after error |
| `_isSending` and `_callModeActive` are module-level | React closures go stale — module vars never do |

---

## app/api/tts-stream/route.ts

| Rule | Why |
|------|-----|
| Soniox: `audio_format: "mp3"`, `Content-Type: audio/mpeg` | Maya A streaming works with chunked decodeAudioData |
| Fish: `format: "mp3"`, `streaming: true`, `prepareFishTTS(text)` | Maya B cloned voice needs punctuation + pause tags |
| Fish: NOT `format: "wav"` with chunked client decode | WAV chunking breaks after ~1 word |

---

## app/callmode/page.tsx

| Rule | Why |
|------|-----|
| Soniox path: `CHUNK = 16384` + `playChunk` | Low-latency Maya A streaming |
| Fish path: collect full buffer + `playMP3` | Reliable Maya B playback |
| `provider: ttsProviderRef.current` in TTS fetch | Routes to correct API branch |
| `fallbackOpening()` if `/api/context` slow | Call button must never stay disabled |
| Call button `disabled={limitReached}` only | Never gate on `cachedOpening` |
| `finishTTSPlayback` → single `restartMic` | Prevents double WS / 429 errors |
| `429` in `onError` → `endCall` | Hard stop on concurrent STT limit |

---

## lib/fish-tts.ts

| Rule | Why |
|------|-----|
| `(break)` after commas, `(long-break)` after `.!?` | Fish Audio paralanguage pauses |
| ES5-safe emoji strip (no `\p{}`) | Vercel build targets es5 |

---

## Billing kill-switch (`lib/billing-config.ts`)

| Rule | Why |
|------|-----|
| Default OFF — no `BILLING_ENABLED` env var | Safe main deploy: no minute caps, no Razorpay |
| Enable with `BILLING_ENABLED=true` + `NEXT_PUBLIC_BILLING_ENABLED=true` | Server enforcement + client UI (/subscribe, usage ticks) |
| All limits flow through `getUsageStats` / `isBillingEnabled()` | Single gate — never check limits ad-hoc without the flag |

---

## General Rules

1. Read the FULL function before changing it
2. Run `bash test-critical.sh && npm run build` before every push (or `npm run prepush`)
3. Never add guards to `stop()` — all guards go in `handleRecordingEnd`
4. Never patch without stating which critical rule is affected
5. If a fix touches SpeechRecorder — test manually before pushing
6. One bug fix per commit — never bundle fixes with features

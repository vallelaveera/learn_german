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

## General Rules

1. Read the FULL function before changing it
2. Run `bash test-critical.sh` before every push
3. Never add guards to `stop()` — all guards go in `handleRecordingEnd`
4. Never patch without stating which critical rule is affected
5. If a fix touches SpeechRecorder — test manually before pushing
6. One bug fix per commit — never bundle fixes with features

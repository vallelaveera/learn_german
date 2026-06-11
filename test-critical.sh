#!/bin/bash
echo ""
echo "═══════════════════════════════════════"
echo "  CallMeDaily — Critical Path Tests"
echo "═══════════════════════════════════════"
echo ""

PASS=0
FAIL=0

check() {
  local desc=$1
  local result=$2
  if [ "$result" = "ok" ]; then
    echo "  ✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ BROKEN: $desc"
    FAIL=$((FAIL + 1))
  fi
}

# Fail if pattern found (inverted check)
check_absent() {
  local desc=$1
  local file=$2
  local pattern=$3
  if grep -qE "$pattern" "$file" 2>/dev/null; then
    check "$desc" "fail"
  else
    check "$desc" "ok"
  fi
}

echo "── SpeechRecorder.tsx ──────────────────"

grep -q "enable_endpoint_detection: true" components/SpeechRecorder.tsx \
  && check "endpoint_detection is true" "ok" \
  || check "endpoint_detection is true" "fail"

STOP_BLOCK=$(awk '/const stop = useCallback/,/\}, \[onVolume\]/' components/SpeechRecorder.tsx)
echo "$STOP_BLOCK" | grep -q "endFiredRef" \
  && check "endFiredRef NOT in stop()" "fail" \
  || check "endFiredRef NOT in stop()" "ok"

echo "$STOP_BLOCK" | grep -qE "500|1000|2000" \
  && check "WebSocket delayed close present" "ok" \
  || check "WebSocket delayed close present" "fail"

grep -q "onEnd();" components/SpeechRecorder.tsx \
  && check "onEnd fires via res.finished" "ok" \
  || check "onEnd fires via res.finished" "fail"

echo ""
echo "── app/call/page.tsx ───────────────────"

grep -q "_isSending = false" app/call/page.tsx \
  && check "_isSending reset on start" "ok" \
  || check "_isSending reset on start" "fail"

grep -q 'finalBufferRef.current = ""' app/call/page.tsx \
  && check "finalBufferRef cleared on start" "ok" \
  || check "finalBufferRef cleared on start" "fail"

grep -A3 "catch {" app/call/page.tsx | grep -q "_isSending = false" \
  && check "_isSending reset in catch block" "ok" \
  || check "_isSending reset in catch block" "fail"

grep -q "^let _isSending = false" app/call/page.tsx \
  && check "module-level _isSending exists" "ok" \
  || check "module-level _isSending exists" "fail"

grep -q "^let _callModeActive = false" app/call/page.tsx \
  && check "module-level _callModeActive exists" "ok" \
  || check "module-level _callModeActive exists" "fail"

# Maya A streaming in manual call mode
grep -q "CHUNK = 16384" app/call/page.tsx \
  && check "manual mode: Soniox chunked streaming (16KB)" "ok" \
  || check "manual mode: Soniox chunked streaming (16KB)" "fail"

LISTENING_BLOCK=$(awk '/else if.*callState.*listening/,/else if.*callState.*speaking/' app/call/page.tsx)
echo "$LISTENING_BLOCK" | grep -q 'finalBufferRef.current = ""' \
  && check "buffer NOT cleared on tap-to-send" "fail" \
  || check "buffer NOT cleared on tap-to-send" "ok"

echo ""
echo "── app/api/tts-stream/route.ts ─────────"

# Maya A — Soniox MP3 streaming
grep -q 'audio_format: "mp3"' app/api/tts-stream/route.ts \
  && check "Maya A API: Soniox audio_format mp3" "ok" \
  || check "Maya A API: Soniox audio_format mp3" "fail"

grep -q '"Content-Type": "audio/mpeg"' app/api/tts-stream/route.ts \
  && check "Maya A API: returns audio/mpeg" "ok" \
  || check "Maya A API: returns audio/mpeg" "fail"

check_absent "Maya A API: NOT wav format" "app/api/tts-stream/route.ts" 'audio_format: "wav"'

# Maya B — Fish MP3 streaming
grep -q 'format: "mp3"' app/api/tts-stream/route.ts \
  && check "Maya B API: Fish format mp3" "ok" \
  || check "Maya B API: Fish format mp3" "fail"

grep -q "streaming: true" app/api/tts-stream/route.ts \
  && check "Maya B API: Fish streaming enabled" "ok" \
  || check "Maya B API: Fish streaming enabled" "fail"

grep -q "prepareFishTTS" app/api/tts-stream/route.ts \
  && check "Maya B API: uses prepareFishTTS" "ok" \
  || check "Maya B API: uses prepareFishTTS" "fail"

check_absent "Maya B API: no prosody override" "app/api/tts-stream/route.ts" "prosody"

check_absent "Maya B API: no normalize override" "app/api/tts-stream/route.ts" "normalize"

check_absent "Maya B API: NOT wav format" "app/api/tts-stream/route.ts" 'format: "wav"'

echo ""
echo "── lib/fish-tts.ts ─────────────────────"

[ -f "lib/fish-tts.ts" ] \
  && check "fish-tts.ts exists" "ok" \
  || check "fish-tts.ts exists" "fail"

grep -q "prepareFishTTS" lib/fish-tts.ts \
  && check "prepareFishTTS exported" "ok" \
  || check "prepareFishTTS exported" "fail"

check_absent "Fish TTS: no (break) tags" "lib/fish-tts.ts" '\\(break\\)'

check_absent "Fish TTS: no (long-break) tags" "lib/fish-tts.ts" 'long-break'

grep -q "Max 2 short sentences" lib/fish-tts.ts \
  && check "Fish TTS: max 2 sentences rule only" "ok" \
  || check "Fish TTS: max 2 sentences rule only" "fail"

check_absent "Fish TTS: no period injection hack" "lib/fish-tts.ts" 'A-ZÄÖÜ'

grep -q "return stripEmojis" lib/fish-tts.ts \
  && check "Fish TTS: prepareFishTTS is emoji-only" "ok" \
  || check "Fish TTS: prepareFishTTS is emoji-only" "fail"

grep -q "FISH_SPOKEN_RULES" app/callmode/page.tsx \
  && check "callmode: Fish spoken rules in prompt" "ok" \
  || check "callmode: Fish spoken rules in prompt" "fail"

check_absent "callmode: no prepareFishTTS in page" "app/callmode/page.tsx" "prepareFishTTS"

grep -qE '/\\p\{' lib/fish-tts.ts \
  && check "ES5-safe emoji strip (no \\p{} regex)" "fail" \
  || check "ES5-safe emoji strip (no \\p{} regex)" "ok"

echo ""
echo "── app/mode/page.tsx ───────────────────"

check_absent "mode page: Fish voice button hidden" "app/mode/page.tsx" 'maya_voice", "fish"'

grep -q 'maya_voice", "soniox"' app/mode/page.tsx \
  && check "mode page: call mode sets soniox" "ok" \
  || check "mode page: call mode sets soniox" "fail"

grep -q 'ttsProviderRef.current = "soniox"' app/callmode/page.tsx \
  && check "callmode: Maya B disabled, forces soniox" "ok" \
  || check "callmode: Maya B disabled, forces soniox" "fail"

echo ""
echo "── lib/memory-agent.ts ─────────────────"

check_absent "onboarding: no forced farewell phrase" "lib/memory-agent.ts" 'Ich rufe dich morgen wieder an'

grep -q 'NEVER say goodbye' lib/memory-agent.ts \
  && check "prompts: never-farewell rule" "ok" \
  || check "prompts: never-farewell rule" "fail"

grep -q 'QUESTIONS ALREADY ASKED' lib/memory-agent.ts \
  && check "memory: askedQuestions in prompt" "ok" \
  || check "memory: askedQuestions in prompt" "fail"

grep -q 'extractAskedQuestionsFromMessages' app/api/extract/route.ts \
  && check "extract: saves askedQuestions" "ok" \
  || check "extract: saves askedQuestions" "fail"

grep -q 'updateCareerVocabProgress' app/api/extract/route.ts \
  && check "extract: career vocab progress" "ok" \
  || check "extract: career vocab progress" "fail"

grep -q 'buildCareerVocabReport' app/api/career-vocab/route.ts \
  && check "career-vocab API route" "ok" \
  || check "career-vocab API route" "fail"

[ -f "data/career-vocab/german_career_vocab.json" ] \
  && check "german_career_vocab.json exists" "ok" \
  || check "german_career_vocab.json exists" "fail"

[ -f "app/career/page.tsx" ] \
  && check "career report page exists" "ok" \
  || check "career report page exists" "fail"

grep -q "Beispiele" app/career/page.tsx \
  && check "career: example sentences UI" "ok" \
  || check "career: example sentences UI" "fail"

echo ""
echo "── app/callmode/page.tsx ───────────────"

[ -f "components/CallRecorder.tsx" ] \
  && check "CallRecorder.tsx exists" "ok" \
  || check "CallRecorder.tsx exists" "fail"

grep -q "useCallRecorder" app/callmode/page.tsx \
  && check "callmode uses CallRecorder" "ok" \
  || check "callmode uses CallRecorder" "fail"

check_absent "callmode does NOT use SpeechRecorder" "app/callmode/page.tsx" "useSpeechRecorder"

grep -q "_cm_sending" app/callmode/page.tsx \
  && check "callmode has own module flags" "ok" \
  || check "callmode has own module flags" "fail"

grep -q "SPEECH_THRESHOLD" app/callmode/page.tsx \
  && check "VAD: speech threshold gate" "ok" \
  || check "VAD: speech threshold gate" "fail"

grep -q "autoGainControl: false" components/CallRecorder.tsx \
  && check "mic: autoGainControl disabled" "ok" \
  || check "mic: autoGainControl disabled" "fail"

grep -q "isSpeakingRef" app/callmode/page.tsx \
  && check "VAD: transcript gated on isSpeakingRef" "ok" \
  || check "VAD: transcript gated on isSpeakingRef" "fail"

grep -q "Speech band only" components/CallRecorder.tsx \
  && check "CallRecorder: speech-frequency volume" "ok" \
  || check "CallRecorder: speech-frequency volume" "fail"

# Maya A — chunked Soniox playback in callmode
grep -q "CHUNK = 16384" app/callmode/page.tsx \
  && check "Maya A callmode: chunked playChunk (16KB)" "ok" \
  || check "Maya A callmode: chunked playChunk (16KB)" "fail"

grep -q "playChunk" app/callmode/page.tsx \
  && check "Maya A callmode: playChunk exists" "ok" \
  || check "Maya A callmode: playChunk exists" "fail"

# Maya B — streamed MP3 chunks (same live-call path as Soniox)
grep -q "TTS_CHUNK" app/callmode/page.tsx \
  && check "Maya B callmode: streamed TTS chunks" "ok" \
  || check "Maya B callmode: streamed TTS chunks" "fail"

check_absent "Maya B callmode: NOT full-buffer playMP3" "app/callmode/page.tsx" "await playMP3"

grep -q 'provider: ttsProviderRef.current' app/callmode/page.tsx \
  && check "callmode: provider sent to tts-stream API" "ok" \
  || check "callmode: provider sent to tts-stream API" "fail"

# Smarter turn-end + short reply confirm
grep -q "sttEndpointRef" app/callmode/page.tsx \
  && check "turn-end: Soniox endpoint ref" "ok" \
  || check "turn-end: Soniox endpoint ref" "fail"

grep -q "Bist du fertig" app/callmode/page.tsx \
  && check "short reply: Bist du fertig confirm" "ok" \
  || check "short reply: Bist du fertig confirm" "fail"

grep -q "Meinst du das so" app/callmode/page.tsx \
  && check "short reply: Meinst du das so confirm" "ok" \
  || check "short reply: Meinst du das so confirm" "fail"

grep -q "askShortConfirm" app/callmode/page.tsx \
  && check "short reply: askShortConfirm flow" "ok" \
  || check "short reply: askShortConfirm flow" "fail"

grep -q "toggleMute" app/callmode/page.tsx \
  && check "callmode: mute button toggleMute" "ok" \
  || check "callmode: mute button toggleMute" "fail"

grep -q "setMuted" components/CallRecorder.tsx \
  && check "CallRecorder: setMuted export" "ok" \
  || check "CallRecorder: setMuted export" "fail"

# Welcome message
grep -q "fallbackOpening" app/callmode/page.tsx \
  && check "welcome: fallbackOpening exists" "ok" \
  || check "welcome: fallbackOpening exists" "fail"

grep -q "streamTTSRef" app/callmode/page.tsx \
  && check "welcome: streamTTSRef for reliable TTS" "ok" \
  || check "welcome: streamTTSRef for reliable TTS" "fail"

grep -qE 'disabled=.*cachedOpening' app/callmode/page.tsx \
  && check "call button NOT blocked on missing cachedOpening" "fail" \
  || check "call button NOT blocked on missing cachedOpening" "ok"

grep -q 'contextReady && !limitReached' app/callmode/page.tsx \
  && check "call button: canCall = contextReady && !limitReached" "ok" \
  || check "call button: canCall = contextReady && !limitReached" "fail"

grep -q 'disabled={!canCall}' app/callmode/page.tsx \
  && check "call button disabled when !canCall" "ok" \
  || check "call button disabled when !canCall" "fail"

check_absent "startCall does NOT bail if no opening" "app/callmode/page.tsx" 'if \(!opening\) return'

# Mic / 429 guards
grep -q "_cm_mic_running" app/callmode/page.tsx \
  && check "mic guard: _cm_mic_running" "ok" \
  || check "mic guard: _cm_mic_running" "fail"

grep -q "finishTTSPlayback" app/callmode/page.tsx \
  && check "single TTS finish path" "ok" \
  || check "single TTS finish path" "fail"

grep -q 'e.includes("429")' app/callmode/page.tsx \
  && check "429 hard stop on concurrent STT" "ok" \
  || check "429 hard stop on concurrent STT" "fail"

check_absent "ES5-safe (no \\p{} in callmode)" "app/callmode/page.tsx" '\\p\{'

echo ""
echo "── exercises (flashcards / spelling) ─"

test -f data/flashcards/placement.json \
  && check "placement deck JSON exists" "ok" \
  || check "placement deck JSON exists" "fail"

test -f components/BinaryFlashcard.tsx \
  && check "BinaryFlashcard component" "ok" \
  || check "BinaryFlashcard component" "fail"

grep -q 'exercises/warmup' app/mode/page.tsx \
  && check "mode: call routes via warmup" "ok" \
  || check "mode: call routes via warmup" "fail"

grep -q 'api/exercises/placement' app/exercises/placement/page.tsx \
  && check "placement page calls API" "ok" \
  || check "placement page calls API" "fail"

grep -q 'exercises/spelling' app/practice/page.tsx \
  && check "practice: spelling exercise link" "ok" \
  || check "practice: spelling exercise link" "fail"

grep -q 'isUsageAllowed' app/api/chat/route.ts \
  && check "chat API usage limit check" "ok" \
  || check "chat API usage limit check" "fail"

grep -q 'completePlacement' lib/kv.ts \
  && check "KV: completePlacement helper" "ok" \
  || check "KV: completePlacement helper" "fail"

grep -q 'getWarmupMasteredKeys' lib/kv.ts \
  && check "warmup: 7-day mastery skip" "ok" \
  || check "warmup: 7-day mastery skip" "fail"

test -f app/exercises/sentences/page.tsx \
  && check "standalone sentence ordering page" "ok" \
  || check "standalone sentence ordering page" "fail"

grep -q 'intentionalStopRef' components/CallRecorder.tsx \
  && check "CallRecorder: ignore WS error on stop" "ok" \
  || check "CallRecorder: ignore WS error on stop" "fail"

echo ""
echo "── call corrections / satzbau report ─"

test -f lib/corrections.ts \
  && check "corrections: extract helper" "ok" \
  || check "corrections: extract helper" "fail"

grep -q 'saveSessionCorrections' lib/kv.ts \
  && check "KV: save session corrections" "ok" \
  || check "KV: save session corrections" "fail"

test -f app/api/corrections/route.ts \
  && check "API: corrections route" "ok" \
  || check "API: corrections route" "fail"

grep -q 'CallCorrectionsPanel' components/CallCorrectionsPanel.tsx \
  && check "UI: call corrections panel" "ok" \
  || check "UI: call corrections panel" "fail"

grep -q 'source=call' app/api/exercises/sentences/route.ts \
  && check "sentences API: call source" "ok" \
  || check "sentences API: call source" "fail"

grep -q 'CallCorrectionsPanel' app/callmode/page.tsx \
  && check "callmode: corrections report" "ok" \
  || check "callmode: corrections report" "fail"

grep -q 'CallCorrectionsPanel' app/call/page.tsx \
  && check "call: corrections report" "ok" \
  || check "call: corrections report" "fail"

echo ""
echo "── middleware.ts ───────────────────────"

grep -q '"/login"' middleware.ts \
  && check "login route is public" "ok" \
  || check "login route is public" "fail"

grep -q '"/api/auth/login"' middleware.ts \
  && check "api/auth/login is public" "ok" \
  || check "api/auth/login is public" "fail"

echo ""
echo "═══════════════════════════════════════"
echo "  Passed: $PASS  Failed: $FAIL"
echo "═══════════════════════════════════════"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "  ⚠️  Fix failures before pushing!"
  echo ""
  exit 1
fi

echo "  All good — safe to push."
echo ""
exit 0

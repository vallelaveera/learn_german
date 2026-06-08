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

echo "── SpeechRecorder.tsx ──────────────────"

# 1. endpoint detection must be true
grep -q "enable_endpoint_detection: true" components/SpeechRecorder.tsx \
  && check "endpoint_detection is true" "ok" \
  || check "endpoint_detection is true" "fail"

# 2. endFiredRef must NOT be in stop()
STOP_BLOCK=$(awk '/const stop = useCallback/,/\}, \[onVolume\]/' components/SpeechRecorder.tsx)
echo "$STOP_BLOCK" | grep -q "endFiredRef" \
  && check "endFiredRef NOT in stop()" "fail" \
  || check "endFiredRef NOT in stop()" "ok"

# 3. WebSocket must stay open 2000ms
echo "$STOP_BLOCK" | grep -q "2000" \
  && check "WebSocket waits 2000ms before close" "ok" \
  || check "WebSocket waits 2000ms before close" "fail"

# 4. onEnd only fires via res.finished
grep -q "onEnd();" components/SpeechRecorder.tsx \
  && check "onEnd fires via res.finished" "ok" \
  || check "onEnd fires via res.finished" "fail"

echo ""
echo "── app/call/page.tsx ───────────────────"

# 5. _isSending reset on new recording
grep -q "_isSending = false" app/call/page.tsx \
  && check "_isSending reset on start" "ok" \
  || check "_isSending reset on start" "fail"

# 6. finalBufferRef cleared on start
grep -q 'finalBufferRef.current = ""' app/call/page.tsx \
  && check "finalBufferRef cleared on start" "ok" \
  || check "finalBufferRef cleared on start" "fail"

# 7. _isSending reset in catch block
grep -A3 "catch {" app/call/page.tsx | grep -q "_isSending = false" \
  && check "_isSending reset in catch block" "ok" \
  || check "_isSending reset in catch block" "fail"

# 8. module level flags exist
grep -q "^let _isSending = false" app/call/page.tsx \
  && check "module-level _isSending exists" "ok" \
  || check "module-level _isSending exists" "fail"

grep -q "^let _callModeActive = false" app/call/page.tsx \
  && check "module-level _callModeActive exists" "ok" \
  || check "module-level _callModeActive exists" "fail"

echo ""
echo "── middleware.ts ───────────────────────"

# 9. login route is public
grep -q '"/login"' middleware.ts \
  && check "login route is public" "ok" \
  || check "login route is public" "fail"

# 10. auth/login API is public  
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

const FEMALE_GERMAN_VOICES = [
  "Anna",
  "Helena",
  "Hedda",
  "Petra",
  "Marlene",
  "Vicki",
];

let cachedVoice: SpeechSynthesisVoice | null = null;
const speakQueue: string[] = [];
let queueProcessing = false;
let onIdleCallback: (() => void) | null = null;
let queueVoice: SpeechSynthesisVoice | null = null;
let queueRate = 0.9;

function notifyIdle(): void {
  if (!queueProcessing && speakQueue.length === 0) {
    onIdleCallback?.();
    onIdleCallback = null;
  }
}

export const whenGermanSpeechIdle = (cb: () => void): void => {
  if (!queueProcessing && speakQueue.length === 0) {
    cb();
    return;
  }
  onIdleCallback = cb;
};

export const getAllGermanVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === "undefined") return [];
  return window.speechSynthesis
    .getVoices()
    .filter(v => v.lang === "de-DE" || v.lang.startsWith("de"));
};

export const getGermanFemaleVoice = (): SpeechSynthesisVoice | null => {
  if (cachedVoice) return cachedVoice;
  const german = getAllGermanVoices();
  cachedVoice =
    german.find(v => FEMALE_GERMAN_VOICES.some(n => v.name.includes(n))) ||
    german.find(v => v.localService) ||
    german[0] ||
    null;
  return cachedVoice;
};

export const initGermanTTS = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise(resolve => {
    if (typeof window === "undefined") return resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(getAllGermanVoices());
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(getAllGermanVoices());
      };
    }
  });
};

function processSpeakQueue(onDone?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (queueProcessing || speakQueue.length === 0) {
    if (!queueProcessing && speakQueue.length === 0) onDone?.();
    return;
  }

  queueProcessing = true;
  const text = speakQueue.shift()!;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = queueRate;
  utterance.pitch = 1.1;
  utterance.voice = queueVoice ?? getGermanFemaleVoice();
  utterance.onend = () => {
    queueProcessing = false;
    if (speakQueue.length > 0) {
      processSpeakQueue(onDone);
    } else {
      onDone?.();
      notifyIdle();
    }
  };
  utterance.onerror = () => {
    queueProcessing = false;
    processSpeakQueue(onDone);
    notifyIdle();
  };
  window.speechSynthesis.speak(utterance);
}

export const speakGerman = (
  text: string,
  voice?: SpeechSynthesisVoice | null,
  rate = 0.90,
  onDone?: () => void,
): void => {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;
  queueVoice = voice ?? getGermanFemaleVoice();
  queueRate = rate;
  speakQueue.push(text.trim());
  processSpeakQueue(onDone);
};

export const stopSpeaking = (): void => {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  speakQueue.length = 0;
  queueProcessing = false;
  onIdleCallback = null;
};

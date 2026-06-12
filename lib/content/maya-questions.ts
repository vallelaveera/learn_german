export type MayaQuestion = {
  de: string;
  en: string;
  emoji: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  category: string;
};

export const MAYA_QUESTIONS: MayaQuestion[] = [
  // A1
  { de: "Wie heißt das auf Deutsch?", en: "What is that in German?", emoji: "🇩🇪", level: "A1", category: "vocabulary" },
  { de: "Was ist das?", en: "What is that?", emoji: "👀", level: "A1", category: "vocabulary" },
  { de: "Wie geht es dir heute?", en: "How are you today?", emoji: "😊", level: "A1", category: "greeting" },
  { de: "Welche Farbe ist das?", en: "What color is that?", emoji: "🎨", level: "A1", category: "vocabulary" },
  { de: "Kannst du das buchstabieren?", en: "Can you spell that?", emoji: "✏️", level: "A1", category: "spelling" },
  { de: "Was machst du gern?", en: "What do you like to do?", emoji: "⭐", level: "A1", category: "daily_life" },
  { de: "Wie spät ist es?", en: "What time is it?", emoji: "🕐", level: "A1", category: "time" },
  { de: "Wo wohnst du?", en: "Where do you live?", emoji: "🏠", level: "A1", category: "daily_life" },

  // A2
  { de: "Welchen Artikel hat 'Bahnhof'?", en: "What article does 'Bahnhof' have?", emoji: "🤔", level: "A2", category: "grammar" },
  { de: "Was ist der Plural von 'Kind'?", en: "What is the plural of 'Kind'?", emoji: "📚", level: "A2", category: "grammar" },
  { de: "Wie sagt man 'I am tired'?", en: "How do you say 'I am tired'?", emoji: "😴", level: "A2", category: "translation" },
  { de: "Was hast du gestern gemacht?", en: "What did you do yesterday?", emoji: "📅", level: "A2", category: "past_tense" },
  { de: "Kannst du das wiederholen?", en: "Can you repeat that?", emoji: "🔄", level: "A2", category: "speaking" },
  { de: "Wie konjugierst du 'fahren'?", en: "How do you conjugate 'fahren'?", emoji: "🚂", level: "A2", category: "grammar" },
  { de: "Was bedeutet 'trotzdem'?", en: "What does 'trotzdem' mean?", emoji: "💭", level: "A2", category: "vocabulary" },
  { de: "Magst du Kaffee oder Tee?", en: "Do you prefer coffee or tea?", emoji: "☕", level: "A2", category: "daily_life" },

  // B1
  { de: "Nominativ oder Akkusativ?", en: "Nominative or accusative?", emoji: "🎯", level: "B1", category: "grammar" },
  { de: "Welcher Fall ist das hier?", en: "Which case is this?", emoji: "📖", level: "B1", category: "grammar" },
  { de: "Kannst du das umformulieren?", en: "Can you rephrase that?", emoji: "🔁", level: "B1", category: "speaking" },
  { de: "Was ist der Unterschied?", en: "What's the difference?", emoji: "⚡", level: "B1", category: "vocabulary" },
  { de: "Wie würdest du das erklären?", en: "How would you explain that?", emoji: "💡", level: "B1", category: "speaking" },
  { de: "Benutze das in einem Satz.", en: "Use that in a sentence.", emoji: "✍️", level: "B1", category: "grammar" },
  { de: "Was ist das Gegenteil?", en: "What's the opposite?", emoji: "↔️", level: "B1", category: "vocabulary" },
  { de: "Kannst du das formeller sagen?", en: "Can you say that more formally?", emoji: "👔", level: "B1", category: "register" },

  // B2
  { de: "Konjunktiv II — wie geht das?", en: "Subjunctive II — how does that work?", emoji: "🧠", level: "B2", category: "grammar" },
  { de: "Was ist der Genitiv davon?", en: "What's the genitive of that?", emoji: "📝", level: "B2", category: "grammar" },
  { de: "Wie klingt das natürlicher?", en: "How does that sound more natural?", emoji: "🎙️", level: "B2", category: "speaking" },
  { de: "Kennst du ein Synonym?", en: "Do you know a synonym?", emoji: "🔍", level: "B2", category: "vocabulary" },
  { de: "Erkläre das auf Deutsch.", en: "Explain that in German.", emoji: "🗣️", level: "B2", category: "speaking" },
  { de: "Passiv oder Aktiv hier?", en: "Passive or active here?", emoji: "⚖️", level: "B2", category: "grammar" },
  { de: "Was impliziert dieser Satz?", en: "What does this sentence imply?", emoji: "🤓", level: "B2", category: "comprehension" },
  { de: "Welches Verb passt hier?", en: "Which verb fits here?", emoji: "🎲", level: "B2", category: "vocabulary" },

  // C1
  { de: "Welche Konnotation hat das?", en: "What connotation does that have?", emoji: "🔬", level: "C1", category: "advanced" },
  { de: "Wie klingt das stilistisch?", en: "How does that sound stylistically?", emoji: "🎭", level: "C1", category: "advanced" },
  { de: "Erkläre die Nuance.", en: "Explain the nuance.", emoji: "💎", level: "C1", category: "advanced" },
  { de: "Gibt es eine Redewendung dafür?", en: "Is there an idiom for that?", emoji: "📜", level: "C1", category: "idioms" },
  { de: "Wie würde ein Muttersprachler sagen?", en: "How would a native speaker say it?", emoji: "🌟", level: "C1", category: "advanced" },
];

export function getQuestionsForLevel(level: string): MayaQuestion[] {
  const levelMap: Record<string, string[]> = {
    A1: ["A1"],
    A2: ["A1", "A2"],
    B1: ["A2", "B1"],
    B2: ["B1", "B2"],
    C1: ["B2", "C1"],
    C2: ["B2", "C1"],
  };
  const allowed = levelMap[level] || ["A2", "B1"];
  return MAYA_QUESTIONS.filter(q => allowed.includes(q.level));
}

export function pickRandomQuestion(
  level: string,
  excludeRecent: string[] = [],
): MayaQuestion {
  const pool = getQuestionsForLevel(level).filter(q => !excludeRecent.includes(q.de));

  if (pool.length === 0) {
    const fallback = getQuestionsForLevel(level);
    return fallback[Math.floor(Math.random() * fallback.length)] ?? MAYA_QUESTIONS[0];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

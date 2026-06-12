export type MayaQuestion = {
  de: string;
  emoji: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  category: string;
};

export const MAYA_QUESTIONS: MayaQuestion[] = [
  // A1
  { de: "Wie heißt das auf Deutsch?", emoji: "🇩🇪", level: "A1", category: "vocabulary" },
  { de: "Was ist das?", emoji: "👀", level: "A1", category: "vocabulary" },
  { de: "Wie geht es dir heute?", emoji: "😊", level: "A1", category: "greeting" },
  { de: "Welche Farbe ist das?", emoji: "🎨", level: "A1", category: "vocabulary" },
  { de: "Kannst du das buchstabieren?", emoji: "✏️", level: "A1", category: "spelling" },
  { de: "Was machst du gern?", emoji: "⭐", level: "A1", category: "daily_life" },
  { de: "Wie spät ist es?", emoji: "🕐", level: "A1", category: "time" },
  { de: "Wo wohnst du?", emoji: "🏠", level: "A1", category: "daily_life" },

  // A2
  { de: "Welchen Artikel hat 'Bahnhof'?", emoji: "🤔", level: "A2", category: "grammar" },
  { de: "Was ist der Plural von 'Kind'?", emoji: "📚", level: "A2", category: "grammar" },
  { de: "Wie sagt man 'I am tired'?", emoji: "😴", level: "A2", category: "translation" },
  { de: "Was hast du gestern gemacht?", emoji: "📅", level: "A2", category: "past_tense" },
  { de: "Kannst du das wiederholen?", emoji: "🔄", level: "A2", category: "speaking" },
  { de: "Wie konjugierst du 'fahren'?", emoji: "🚂", level: "A2", category: "grammar" },
  { de: "Was bedeutet 'trotzdem'?", emoji: "💭", level: "A2", category: "vocabulary" },
  { de: "Magst du Kaffee oder Tee?", emoji: "☕", level: "A2", category: "daily_life" },

  // B1
  { de: "Nominativ oder Akkusativ?", emoji: "🎯", level: "B1", category: "grammar" },
  { de: "Welcher Fall ist das hier?", emoji: "📖", level: "B1", category: "grammar" },
  { de: "Kannst du das umformulieren?", emoji: "🔁", level: "B1", category: "speaking" },
  { de: "Was ist der Unterschied?", emoji: "⚡", level: "B1", category: "vocabulary" },
  { de: "Wie würdest du das erklären?", emoji: "💡", level: "B1", category: "speaking" },
  { de: "Benutze das in einem Satz.", emoji: "✍️", level: "B1", category: "grammar" },
  { de: "Was ist das Gegenteil?", emoji: "↔️", level: "B1", category: "vocabulary" },
  { de: "Kannst du das formeller sagen?", emoji: "👔", level: "B1", category: "register" },

  // B2
  { de: "Konjunktiv II — wie geht das?", emoji: "🧠", level: "B2", category: "grammar" },
  { de: "Was ist der Genitiv davon?", emoji: "📝", level: "B2", category: "grammar" },
  { de: "Wie klingt das natürlicher?", emoji: "🎙️", level: "B2", category: "speaking" },
  { de: "Kennst du ein Synonym?", emoji: "🔍", level: "B2", category: "vocabulary" },
  { de: "Erkläre das auf Deutsch.", emoji: "🗣️", level: "B2", category: "speaking" },
  { de: "Passiv oder Aktiv hier?", emoji: "⚖️", level: "B2", category: "grammar" },
  { de: "Was impliziert dieser Satz?", emoji: "🤓", level: "B2", category: "comprehension" },
  { de: "Welches Verb passt hier?", emoji: "🎲", level: "B2", category: "vocabulary" },

  // C1
  { de: "Welche Konnotation hat das?", emoji: "🔬", level: "C1", category: "advanced" },
  { de: "Wie klingt das stilistisch?", emoji: "🎭", level: "C1", category: "advanced" },
  { de: "Erkläre die Nuance.", emoji: "💎", level: "C1", category: "advanced" },
  { de: "Gibt es eine Redewendung dafür?", emoji: "📜", level: "C1", category: "idioms" },
  { de: "Wie würde ein Muttersprachler sagen?", emoji: "🌟", level: "C1", category: "advanced" },
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
    return MAYA_QUESTIONS[Math.floor(Math.random() * MAYA_QUESTIONS.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

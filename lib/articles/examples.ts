import type { ArticleType, CaseId, GenderId } from "./types";

type ExampleMap = Record<CaseId, Record<GenderId, string>>;

export const DEFINITE_EXAMPLES: ExampleMap = {
  nom: {
    m: "Der Mann liest. (The man reads.)",
    f: "Die Frau arbeitet. (The woman works.)",
    n: "Das Kind spielt. (The child plays.)",
    pl: "Die Kinder schlafen. (The children sleep.)",
  },
  akk: {
    m: "Ich sehe den Mann. (I see the man.) ← der→den!",
    f: "Ich sehe die Frau. (I see the woman.)",
    n: "Ich sehe das Kind. (I see the child.)",
    pl: "Ich sehe die Kinder. (I see the children.)",
  },
  dat: {
    m: "Ich helfe dem Mann. (I help the man.) ← der→dem!",
    f: "Ich helfe der Frau. (I help the woman.) ← die→der!",
    n: "Ich helfe dem Kind. (I help the child.) ← das→dem!",
    pl: "Ich helfe den Kindern. (I help the children.) ← die→den!",
  },
  gen: {
    m: "Das Auto des Mannes. (The man's car.) ← der→des!",
    f: "Das Auto der Frau. (The woman's car.)",
    n: "Das Spielzeug des Kindes. (The child's toy.) ← das→des!",
    pl: "Das Haus der Kinder. (The children's house.)",
  },
};

export const INDEFINITE_EXAMPLES: ExampleMap = {
  nom: {
    m: "Ein Mann kommt. (A man comes.)",
    f: "Eine Frau kommt. (A woman comes.)",
    n: "Ein Kind kommt. (A child comes.)",
    pl: "— (no plural for ein)",
  },
  akk: {
    m: "Ich sehe einen Mann. ← ein→einen!",
    f: "Ich sehe eine Frau.",
    n: "Ich sehe ein Kind.",
    pl: "— (keine Bücher = no books)",
  },
  dat: {
    m: "Ich helfe einem Mann. ← ein→einem!",
    f: "Ich helfe einer Frau. ← eine→einer!",
    n: "Ich helfe einem Kind. ← ein→einem!",
    pl: "— (keinen Büchern)",
  },
  gen: {
    m: "Das Auto eines Mannes. ← ein→eines!",
    f: "Das Auto einer Frau. ← eine→einer!",
    n: "Das Auto eines Kindes. ← ein→eines!",
    pl: "— (keiner Bücher)",
  },
};

export function getExample(type: ArticleType, caseId: CaseId, gender: GenderId): string {
  return type === "def" ? DEFINITE_EXAMPLES[caseId][gender] : INDEFINITE_EXAMPLES[caseId][gender];
}

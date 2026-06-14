import type { GrammarCategory, VerifiedLevel } from "./verified-curriculum";

export interface TrainerLink {
  href: string;
  label: string;
  ready: boolean;
}

/** Maps verified catalog category + level to existing or new trainer routes. */
export function getCategoryTrainerLink(
  level: VerifiedLevel,
  category: GrammarCategory,
): TrainerLink | null {
  switch (category) {
    case "derDieDas":
      return { href: "/grammar/gender", label: "DER DIE DAS Üben", ready: true };

    case "cases":
      if (level === "A1") {
        return { href: "/grammar/a1-cases", label: "Fälle A1 — Nom & Akk", ready: true };
      }
      if (level === "A2") {
        return { href: "/grammar/a2-cases", label: "Fälle A2 — Dativ", ready: true };
      }
      if (level === "B1" || level === "B2" || level === "C1") {
        return { href: "/grammar/cases", label: "Fälle meistern", ready: true };
      }
      return null;

    case "tenses":
      if (level === "A1") {
        return { href: "/grammar/a1-tenses", label: "Zeiten A1 — Präsens", ready: true };
      }
      if (level === "A2") {
        return { href: "/grammar/a2-tenses", label: "Zeiten A2 — Perfekt", ready: true };
      }
      if (level === "B1" || level === "B2" || level === "C1") {
        return { href: "/grammar/tenses", label: "Zeiten verstehen", ready: true };
      }
      return null;

    case "prepositions":
      if (level === "A1") return null;
      if (level === "A2") {
        return {
          href: `/grammar/learn?level=A2&category=prepositions`,
          label: "Präpositionen A2",
          ready: true,
        };
      }
      if (level === "B1" || level === "B2" || level === "C1") {
        return { href: "/grammar/prepositions", label: "Präpositionen", ready: true };
      }
      return null;

    default:
      return null;
  }
}

export function getLearnHref(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: "basic" | "advanced",
): string {
  return `/grammar/learn?level=${level}&category=${category}&tier=${tier}`;
}

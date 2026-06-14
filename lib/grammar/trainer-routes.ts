import {
  getCategoryBlock,
  type GrammarCategory,
  type GrammarTier,
  type VerifiedLevel,
} from "./verified-curriculum";

export interface TrainerLink {
  href: string;
  label: string;
  ready: boolean;
}

const VERIFIED_TRAINER_PATHS = [
  "/grammar/a1-cases",
  "/grammar/a2-cases",
  "/grammar/a1-tenses",
  "/grammar/a2-tenses",
] as const;

function isVerifiedTrainerPath(href: string): boolean {
  return VERIFIED_TRAINER_PATHS.some(p => href.startsWith(p));
}

function trainerHrefWithContext(
  href: string,
  level: VerifiedLevel,
  tier: GrammarTier,
): string {
  if (isVerifiedTrainerPath(href)) {
    return `${href}?level=${level}&tier=${tier}`;
  }
  return `${href}?level=${level}`;
}

/** Legacy or verified interactive trainer (not the learn page). */
export function getCategoryTrainerLink(
  level: VerifiedLevel,
  category: GrammarCategory,
): TrainerLink | null {
  switch (category) {
    case "derDieDas":
      if (getCategoryBlock(level, category).appCoverage.status === "MISSING") {
        return null;
      }
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
      return null;

    default:
      return null;
  }
}

export function getLearnHref(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): string {
  return `/grammar/learn?level=${level}&category=${category}&tier=${tier}`;
}

/** Primary navigation target from catalog — respects tier and coverage. */
export function getCategoryHref(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): string {
  const block = getCategoryBlock(level, category);

  if (tier === "advanced" || block.appCoverage.status === "MISSING") {
    return getLearnHref(level, category, tier);
  }

  if (category === "prepositions") {
    return getLearnHref(level, category, tier);
  }

  const trainer = getCategoryTrainerLink(level, category);
  if (trainer?.ready) {
    return trainerHrefWithContext(trainer.href, level, tier);
  }

  return getLearnHref(level, category, tier);
}

/** Shown on learn page — link to full interactive trainer when one exists. */
export function getInteractiveTrainerLink(
  level: VerifiedLevel,
  category: GrammarCategory,
  tier: GrammarTier,
): TrainerLink | null {
  if (tier === "advanced") return null;
  const trainer = getCategoryTrainerLink(level, category);
  if (!trainer?.ready) return null;
  return { ...trainer, href: trainerHrefWithContext(trainer.href, level, "basic") };
}

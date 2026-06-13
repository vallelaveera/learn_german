import { DEFINITE, DEF_CHANGED, isChangedFromNominativ } from "@/lib/articles/declension";
import type { CaseId, GenderId } from "@/lib/articles/types";
import type { CaseGender, CaseKey, CaseNoun, GovCase, VerbRole } from "./types";

const GENDER_MAP: Record<CaseGender, GenderId> = { m: "m", f: "f", n: "n" };

export function roleToCase(role: VerbRole): Exclude<CaseKey, "wechsel"> {
  return role;
}

export function govCaseToCaseId(c: GovCase): CaseId {
  return c;
}

export function definiteArticle(gender: CaseGender, caseId: CaseId, plural = false): string {
  const g: GenderId = plural ? "pl" : GENDER_MAP[gender];
  return DEFINITE[caseId][g];
}

export function nounForm(noun: CaseNoun, caseId: CaseId, plural = false): string {
  if (plural) {
    if (caseId === "dat") return noun.dativePl;
    return noun.plural;
  }
  if (noun.nDecl && caseId !== "nom") {
    return `${noun.word}n`;
  }
  if (caseId === "gen") {
    return noun.genitiveSg;
  }
  return noun.word;
}

export function phrase(noun: CaseNoun, caseId: CaseId, plural = false): string {
  const art = definiteArticle(noun.gender, caseId, plural);
  return `${art} ${nounForm(noun, caseId, plural)}`;
}

export function dictForm(noun: CaseNoun): string {
  const art = definiteArticle(noun.gender, "nom");
  return `${art} ${noun.word}`;
}

export function explainArticleChange(
  noun: CaseNoun,
  caseId: CaseId,
  plural = false,
): string {
  const g: GenderId = plural ? "pl" : GENDER_MAP[noun.gender];
  const nomArt = DEFINITE.nom[g];
  const art = DEFINITE[caseId][g];
  const name = plural ? noun.plural : noun.word;

  if (caseId === "nom") {
    return `${name} — Nominativ; subject form ${art}`;
  }

  if (noun.nDecl && !plural) {
    return `${art} ${nounForm(noun, caseId)} — n-Deklination: ${noun.word} → ${nounForm(noun, caseId)} in ${caseId}`;
  }

  if (!isChangedFromNominativ("def", caseId, g)) {
    return `${art} ${name} — ${g === "f" ? "feminine" : g === "n" ? "neuter" : "form"}; article looks the same as Nominativ (${nomArt})`;
  }

  return `${art} ${name} — ${g === "m" ? "masculine" : g === "pl" ? "plural" : "form"} in ${caseId}: ${nomArt} → ${art}`;
}

export function weakAdjectiveEnding(caseId: CaseId, gender: CaseGender, plural = false): string {
  const g = plural ? "pl" : GENDER_MAP[gender];
  const table: Record<CaseId, Record<GenderId, string>> = {
    nom: { m: "-e", f: "-e", n: "-e", pl: "-en" },
    akk: { m: "-en", f: "-e", n: "-e", pl: "-en" },
    dat: { m: "-en", f: "-en", n: "-en", pl: "-en" },
    gen: { m: "-en", f: "-en", n: "-en", pl: "-en" },
  };
  return table[caseId][g];
}

export function changedGendersForCase(caseId: CaseId): GenderId[] {
  if (caseId === "nom") return [];
  return DEF_CHANGED[caseId] ?? [];
}

export function englishFromPattern(
  pattern: string,
  slots: Partial<Record<VerbRole, { en: string }>>,
): string {
  return pattern
    .replace("{nom}", slots.nom?.en ?? "…")
    .replace("{dat}", slots.dat?.en ?? "…")
    .replace("{akk}", slots.akk?.en ?? "…");
}

export function germanSentenceParts(
  verbConj: string,
  frame: VerbRole[],
  slotPhrases: Partial<Record<VerbRole, string>>,
  prep?: { word: string; phrase: string },
): string {
  const nom = slotPhrases.nom ?? "…";
  const parts: string[] = [nom, verbConj];
  if (prep) {
    parts.push(`${prep.word} ${prep.phrase}`);
    return parts.join(" ") + ".";
  }
  for (const role of frame) {
    if (role === "nom") continue;
    parts.push(slotPhrases[role] ?? "…");
  }
  return parts.join(" ") + ".";
}

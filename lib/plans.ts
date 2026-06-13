export type PlanId = "free" | "basic" | "pro";

export interface PlanConfig {
  id: PlanId;
  label: string;
  labelDe: string;
  monthlyMinutes: number;
  priceInrPaise: number;
  priceDisplay: string;
  features: string[];
  canShareWithFriends: boolean;
  callReplay: boolean;
  bothVoices: boolean;
  homework: boolean;
}

export const PRO_SHARE_MAX = 3;

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    labelDe: "Kostenlos",
    monthlyMinutes: 30,
    priceInrPaise: 0,
    priceDisplay: "€0",
    features: [
      "30 Minuten Maya pro Monat",
      "Wörter & Sätze üben",
      "Grammatik-Übungen",
    ],
    canShareWithFriends: false,
    callReplay: false,
    bothVoices: true,
    homework: false,
  },
  basic: {
    id: "basic",
    label: "Basic",
    labelDe: "Basic",
    monthlyMinutes: 450,
    priceInrPaise: 90000,
    priceDisplay: "€9",
    features: [
      "450 Minuten pro Monat (~15 Min/Tag, flexibel)",
      "Volle Gespräche mit Maya",
      "Wiederholung & Grammatik-Fortschritt",
      "Korrekturen üben",
      "Beide Maya-Stimmen",
    ],
    canShareWithFriends: false,
    callReplay: true,
    bothVoices: true,
    homework: false,
  },
  pro: {
    id: "pro",
    label: "Pro",
    labelDe: "Pro",
    monthlyMinutes: 450,
    priceInrPaise: 149900,
    priceDisplay: "€14.99",
    features: [
      "Alles aus Basic",
      "Bis zu 3 Freunde einladen (jeder eigene Minuten)",
      "Hausaufgaben-Modus",
      "E-Mail-Support",
    ],
    canShareWithFriends: true,
    callReplay: true,
    bothVoices: true,
    homework: true,
  },
};

export function planFromEnv(plan: PlanId): PlanConfig {
  const base = PLANS[plan];
  if (plan === "basic" && process.env.RAZORPAY_BASIC_PAISE) {
    return { ...base, priceInrPaise: Number(process.env.RAZORPAY_BASIC_PAISE) };
  }
  if (plan === "pro" && process.env.RAZORPAY_PRO_PAISE) {
    return { ...base, priceInrPaise: Number(process.env.RAZORPAY_PRO_PAISE) };
  }
  return base;
}

export function isPaidPlan(plan: PlanId): boolean {
  return plan === "basic" || plan === "pro";
}

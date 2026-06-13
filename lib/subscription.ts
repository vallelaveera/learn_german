import type { PlanId } from "./plans";
import { PLANS, PRO_SHARE_MAX } from "./plans";
import type { UserProfile } from "./types";
import {
  getUserProfile,
  getUserIdByEmail,
  saveUserProfile,
  getEffectivePlanAsync,
  listProShareMemberIds,
  addProShareMember,
  removeProShareMemberId,
} from "./kv";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export { getEffectivePlanAsync };

export function planHasFeature(
  plan: PlanId,
  feature: keyof Pick<
    import("./plans").PlanConfig,
    "callReplay" | "bothVoices" | "homework" | "canShareWithFriends"
  >,
): boolean {
  return PLANS[plan][feature];
}

export async function activatePlan(
  userId: string,
  plan: PlanId,
  razorpayPaymentId?: string,
): Promise<UserProfile | null> {
  const profile = await getUserProfile(userId);
  if (!profile) return null;
  profile.plan = plan;
  profile.subscriptionExpiresAt = Date.now() + THIRTY_DAYS_MS;
  if (razorpayPaymentId) profile.lastRazorpayPaymentId = razorpayPaymentId;
  await saveUserProfile(profile);
  return profile;
}

export async function getBillingSummary(userId: string) {
  const profile = await getUserProfile(userId);
  if (!profile) return null;
  const plan = await getEffectivePlanAsync(profile);
  const config = PLANS[plan];
  const isOwner =
    plan === "pro" &&
    !profile.proOwnerId &&
    profile.plan === "pro" &&
    (profile.subscriptionExpiresAt ?? 0) > Date.now();
  let shareMembers: { userId: string; name: string; email: string }[] = [];
  if (isOwner) {
    const ids = await listProShareMemberIds(userId);
    const profiles = await Promise.all(ids.map(id => getUserProfile(id)));
    shareMembers = profiles
      .filter(Boolean)
      .map(p => ({ userId: p!.userId, name: p!.name, email: p!.email }));
  }
  let subscriptionExpiresAt = profile.subscriptionExpiresAt;
  if (profile.proOwnerId) {
    subscriptionExpiresAt = (await getUserProfile(profile.proOwnerId))?.subscriptionExpiresAt;
  }
  return {
    plan,
    config,
    subscriptionExpiresAt,
    isProOwner: isOwner,
    proOwnerId: profile.proOwnerId,
    shareMembers,
    shareMax: PRO_SHARE_MAX,
  };
}

export async function inviteProShareMember(
  ownerId: string,
  email: string,
): Promise<{ ok: true; member: UserProfile } | { ok: false; error: string }> {
  const owner = await getUserProfile(ownerId);
  if (!owner) return { ok: false, error: "Owner not found" };
  if (owner.proOwnerId) return { ok: false, error: "Pro plan required" };
  if (owner.plan !== "pro" || (owner.subscriptionExpiresAt ?? 0) <= Date.now()) {
    return { ok: false, error: "Pro plan required" };
  }

  const normalized = email.toLowerCase().trim();
  const memberId = await getUserIdByEmail(normalized);
  if (!memberId) {
    return {
      ok: false,
      error: "Kein Konto mit dieser E-Mail. Freund muss sich zuerst anmelden.",
    };
  }
  if (memberId === ownerId) return { ok: false, error: "Du kannst dich nicht selbst einladen." };

  const member = await getUserProfile(memberId);
  if (!member) return { ok: false, error: "User not found" };

  const existing = await listProShareMemberIds(ownerId);
  if (existing.includes(memberId)) return { ok: false, error: "Bereits eingeladen." };
  if (existing.length >= PRO_SHARE_MAX) {
    return { ok: false, error: `Maximal ${PRO_SHARE_MAX} Freunde.` };
  }

  member.proOwnerId = ownerId;
  await saveUserProfile(member);
  await addProShareMember(ownerId, memberId);
  return { ok: true, member };
}

export async function removeProShareMember(
  ownerId: string,
  memberId: string,
): Promise<boolean> {
  const existing = await listProShareMemberIds(ownerId);
  if (!existing.includes(memberId)) return false;

  const member = await getUserProfile(memberId);
  if (member?.proOwnerId === ownerId) {
    delete member.proOwnerId;
    await saveUserProfile(member);
  }
  await removeProShareMemberId(ownerId, memberId);
  return true;
}

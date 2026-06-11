import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, getUserIdByEmail, saveUserProfile } from "./kv";
import { UserProfile } from "./types";

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createToken(userId: string, email: string): string {
  const payload = { userId, email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<UserProfile | null> {
  const token =
    req.cookies.get("auth_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return getUserProfile(decoded.userId);
}

export async function findOrCreateUser(email: string, name: string): Promise<UserProfile> {
  const existingId = await getUserIdByEmail(email);
  if (existingId) {
    const profile = await getUserProfile(existingId);
    if (profile) return profile;
  }
  const newProfile: UserProfile = {
    userId: generateId(),
    email,
    name,
    germanLevel: "A1",
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    streak: 0,
    totalSessions: 0,
    facts: {},
  };
  await saveUserProfile(newProfile);
  return newProfile;
}

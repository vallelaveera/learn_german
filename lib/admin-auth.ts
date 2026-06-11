import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function isAdmin(req: NextRequest): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  const user = verifyToken(token);
  return user?.email?.toLowerCase() === adminEmail.toLowerCase();
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, ADMIN_MAX_AGE, createAdminCookie } from "@/lib/admin-session";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const password = formData.get("password") as string;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    return { error: "Server not configured" };
  }

  if (password !== adminPassword) {
    return { error: "Wrong password" };
  }

  const value = createAdminCookie(sessionSecret);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });

  redirect("/admin");
}

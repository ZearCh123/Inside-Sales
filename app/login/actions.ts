"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

/**
 * Sends a Supabase magic link to the submitted email. The link returns the user
 * to /auth/confirm which verifies the OTP and starts the session.
 */
export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Indtast en e-mailadresse." };
  }

  const origin = headers().get("origin") ?? "";
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "sent",
    message: `Vi har sendt et login-link til ${email}. Tjek din indbakke.`,
  };
}

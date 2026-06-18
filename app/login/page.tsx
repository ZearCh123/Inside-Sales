"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendMagicLink, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";

const initialState: LoginState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sender…" : "Send login-link"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(sendMagicLink, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-ink p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-brand-crimson">
            Sales Intelligence
          </p>
          <h1 className="mt-1 text-sm text-muted-foreground">
            Log ind på din konto
          </h1>
        </div>

        {state.status === "sent" ? (
          <p className="rounded-md bg-secondary p-4 text-center text-sm text-secondary-foreground">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="dig@chromologics.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {state.status === "error" && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <SubmitButton />
            <p className="text-center text-xs text-muted-foreground">
              Du får et engangs-login-link på e-mail (magic link).
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import Image from "next/image";
import { updatePassword, type AuthState } from "@/app/actions/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    undefined
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-semibold">PayAlert</span>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h1 className="mb-6 text-xl font-semibold">Elige una nueva contraseña</h1>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-muted">
              Nueva contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-dark disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

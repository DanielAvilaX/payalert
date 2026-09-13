"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/app/actions/auth";
import { Spinner } from "@/app/dashboard/spinner";
import {
  AuthShell,
  authButtonClass,
  authErrorClass,
  authInputClass,
  authLabelClass,
} from "@/app/_auth/auth-shell";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    undefined
  );

  return (
    <AuthShell title="Elige una nueva contraseña" subtitle="Usa al menos 8 caracteres.">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={authInputClass}
          />
        </div>

        {state?.error && <p className={authErrorClass}>{state.error}</p>}

        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending && <Spinner size={16} />}
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </AuthShell>
  );
}

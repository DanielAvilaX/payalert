"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { Spinner } from "@/app/dashboard/spinner";
import {
  AuthShell,
  authButtonClass,
  authErrorClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authNoticeClass,
} from "@/app/_auth/auth-shell";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined
  );

  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle="Te enviamos un enlace para crear una nueva."
    >
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={authInputClass}
          />
        </div>

        {state?.error && <p className={authErrorClass}>{state.error}</p>}
        {state?.message && <p className={authNoticeClass}>{state.message}</p>}

        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending && <Spinner size={16} />}
          {pending ? "Enviando…" : "Enviar enlace"}
        </button>

        <p className="text-center text-sm text-zinc-400">
          <Link href="/login" className={authLinkClass}>
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

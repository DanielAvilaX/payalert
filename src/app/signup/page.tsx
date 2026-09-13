"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "@/app/actions/auth";
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

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Empieza a tener tus pagos bajo control.">
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="name" className={authLabelClass}>
            Nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className={authInputClass}
          />
        </div>

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

        <div>
          <label htmlFor="password" className={authLabelClass}>
            Contraseña
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
          <p className="mt-1 text-xs text-zinc-500">Mínimo 8 caracteres.</p>
        </div>

        {state?.error && <p className={authErrorClass}>{state.error}</p>}
        {state?.message && <p className={authNoticeClass}>{state.message}</p>}

        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending && <Spinner size={16} />}
          {pending ? "Creando cuenta…" : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className={authLinkClass}>
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/actions/auth";
import { Spinner } from "@/app/dashboard/spinner";
import {
  AuthShell,
  authButtonClass,
  authErrorClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
} from "@/app/_auth/auth-shell";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Inicia sesión para ver tus pagos.">
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

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={authLabelClass}>
              Contraseña
            </label>
            <Link href="/forgot-password" className="text-xs text-muted hover:text-accent">
              ¿La olvidaste?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={authInputClass}
          />
        </div>

        {state?.error && <p className={authErrorClass}>{state.error}</p>}

        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending && <Spinner size={16} />}
          {pending ? "Ingresando…" : "Ingresar"}
        </button>

        <p className="text-center text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className={authLinkClass}>
            Regístrate
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

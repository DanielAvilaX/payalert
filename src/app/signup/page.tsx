"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signup, type AuthState } from "@/app/actions/auth";

const inputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-semibold">PayAlert</span>
      </div>

      <div className="glass-panel w-full max-w-sm rounded-xl p-6">
        <h1 className="mb-6 text-xl font-semibold">Crear cuenta</h1>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-muted">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-muted">
              Contraseña
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
          {state?.message && <p className="text-sm text-accent">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {pending ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

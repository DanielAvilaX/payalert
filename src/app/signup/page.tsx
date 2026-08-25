"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserPlus } from "lucide-react";
import { signup, type AuthState } from "@/app/actions/auth";
import { Spinner } from "@/app/dashboard/spinner";

const inputClass = "glass-input w-full rounded-lg px-3 py-2 text-sm text-foreground";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="" width={44} height={44} className="rounded-xl" />
        <span className="text-lg font-semibold">PayAlert</span>
      </div>

      <div className="glass-panel animate-pop-in w-full max-w-sm rounded-2xl p-7">
        <h1 className="mb-6 text-xl font-semibold">Crear cuenta</h1>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-muted">
              Nombre
            </label>
            <input id="name" name="name" type="text" required className={inputClass} />
          </div>

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
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-95 disabled:opacity-50"
          >
            {pending ? <Spinner size={18} /> : <UserPlus size={18} />}
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

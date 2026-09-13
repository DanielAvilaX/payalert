"use client";

import { useActionState } from "react";
import { KeyRound, LogOut, Save } from "lucide-react";
import { changePassword, updateProfileName, type ProfileState } from "./actions";
import { logout } from "@/app/actions/auth";
import { Spinner } from "@/app/dashboard/spinner";

const inputClass = "field w-full rounded-lg px-3 py-2 text-sm";
const labelClass = "text-sm font-medium text-foreground";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-dark active:scale-[0.98] disabled:opacity-50";

function Feedback({ state }: { state: ProfileState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state?.message) {
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>;
  }
  return null;
}

export function ProfileNameForm({ defaultName, email }: { defaultName: string; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileName, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className={labelClass}>
            Nombre
          </label>
          <input
            id="full_name"
            name="full_name"
            defaultValue={defaultName}
            autoComplete="name"
            required
            maxLength={80}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            Correo
          </label>
          <input
            id="email"
            value={email}
            readOnly
            className={`${inputClass} cursor-not-allowed bg-surface-2 text-muted`}
          />
        </div>
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? <Spinner size={16} /> : <Save size={16} />}
        Guardar
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePassword, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className={labelClass}>
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClass}
          />
        </div>
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? <Spinner size={16} /> : <KeyRound size={16} />}
        Cambiar contraseña
      </button>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </form>
  );
}

import { ShieldCheck, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/dashboard-data";
import { colombiaToday } from "@/lib/dates";
import { formatDueDate } from "@/lib/payment-status";
import { Reveal } from "@/app/dashboard/motion";
import { ChangePasswordForm, LogoutButton, ProfileNameForm } from "./profile-forms";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function PerfilPage() {
  // Deduplicated with the layout's own lookup - no second round trip.
  const user = await getCurrentUser();

  const name = ((user?.user_metadata?.full_name as string | undefined) ?? "").trim();
  const email = user?.email ?? "";
  const memberSince = user?.created_at
    ? formatDueDate(colombiaToday(new Date(user.created_at)), true)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Reveal className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted">Tu información y la seguridad de tu cuenta.</p>
      </Reveal>

      <Reveal delay={60}>
        <section className="card flex items-center gap-4 p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
            {initialsOf(name || email)}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold break-words">{name || "Sin nombre"}</p>
            <p className="text-sm break-all text-muted">{email}</p>
            {memberSince && <p className="text-xs text-muted">Miembro desde el {memberSince}</p>}
          </div>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserRound size={18} className="text-accent" />
            Datos personales
          </h2>
          <ProfileNameForm defaultName={name} email={email} />
        </section>
      </Reveal>

      <Reveal delay={180}>
        <section className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck size={18} className="text-accent" />
            Seguridad
          </h2>
          <ChangePasswordForm />
        </section>
      </Reveal>

      <Reveal delay={240}>
        <section className="card p-5">
          <LogoutButton />
        </section>
      </Reveal>
    </div>
  );
}

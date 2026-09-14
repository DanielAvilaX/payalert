import { getCurrentUser, getProfiles, getSupabase } from "@/lib/dashboard-data";
import type { ActivityAction, ActivityDetails } from "@/lib/activity";
import { ActivityFeed, type ActivityEntry } from "@/app/dashboard/historial/activity-feed";
import { Reveal } from "@/app/dashboard/motion";

// Enough to cover months of normal use in one page without turning the
// screen into an infinite scroll nobody reads to the bottom of.
const MAX_ENTRIES = 200;

export default async function HistorialPage() {
  const supabase = await getSupabase();

  // Only the log itself is new work here; the profiles came from the layout.
  const [user, { data: rows }, profiles] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("activity_log")
      .select("id, payment_id, payment_name, actor_id, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_ENTRIES),
    getProfiles(),
  ]);

  const nameOf = new Map(
    profiles.map((profile) => [
      profile.id as string,
      ((profile.full_name as string | null)?.trim() || (profile.email as string | null) || "Alguien"),
    ])
  );

  const entries: ActivityEntry[] = (rows ?? []).map((row) => ({
    id: row.id as string,
    paymentId: (row.payment_id as string | null) ?? null,
    paymentName: row.payment_name as string,
    // No actor means the cron did it - a recurring bill rolling over to its
    // next cycle is the app's doing, not anybody's.
    actorName:
      row.actor_id === null
        ? "PayAlert"
        : row.actor_id === user?.id
          ? "Tú"
          : (nameOf.get(row.actor_id as string) ?? "Alguien"),
    action: row.action as ActivityAction,
    details: (row.details as ActivityDetails | null) ?? null,
    createdAt: row.created_at as string,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Reveal className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
        <p className="mt-1 text-sm text-muted">
          Quién agregó, editó, pagó o compartió cada pago, y cuándo.
        </p>
      </Reveal>

      <ActivityFeed entries={entries} />
    </div>
  );
}

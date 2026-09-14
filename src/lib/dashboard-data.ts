import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ShareLink } from "@/lib/scope";

/**
 * The dashboard's shared reads, deduplicated per request.
 *
 * Rendering one page used to mean four waves of round trips in a row: the
 * proxy checked the session, the layout checked it again and ran its
 * queries, then the page checked it a third time and ran queries that
 * largely repeated the layout's. Supabase answers most calls in a few
 * hundred milliseconds but intermittently takes several seconds, so every
 * extra wave is another chance to draw a slow one - and they add up in
 * series, which is how a page that should take under a second ends up
 * taking twenty.
 *
 * React's `cache` collapses all of that: the layout and the page ask for
 * "the payments" and "who I am" independently, and the second caller gets
 * the first one's answer without touching the network. Each function is one
 * request's worth of memory - nothing is shared between users or requests.
 */
export const getSupabase = cache(async () => createClient());

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Every payment this account can see - its own plus everything shared with
 * it, which is what RLS returns. `*` on purpose: the layout only needs three
 * columns for the notification bell, but asking for the same shape the pages
 * need means they all share this one answer instead of issuing a second,
 * near-identical query.
 */
export const getPayments = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase.from("payments").select("*").order("due_date", { ascending: true });
  return data ?? [];
});

export const getShares = cache(async (): Promise<ShareLink[]> => {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("payment_shares")
    .select("id, payment_id, shared_with, invited_by, status");
  return (data ?? []) as ShareLink[];
});

export const getProfiles = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase.from("profiles").select("id, full_name, email");
  return data ?? [];
});

export const getTelegramConnection = cache(async () => {
  const supabase = await getSupabase();
  const user = await getCurrentUser();
  if (!user) return null;
  // `*` so the page still renders before migration 011 adds
  // notifications_enabled, instead of failing on an unknown column.
  const { data } = await supabase
    .from("telegram_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
});

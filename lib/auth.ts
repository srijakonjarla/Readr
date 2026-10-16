import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the signed-in user for a route handler.
 *
 * On success returns { ok: true, userId }. On failure returns
 * { ok: false, response } — a ready-to-return 401. Every DB query in the API
 * must be scoped by this id: the app connects as `postgres`, which bypasses
 * RLS, so these filters are the real ownership boundary.
 */
export async function requireUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: user.id };
}

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * SECURITY: server-only. Never import this into a Client Component or expose
 * the service-role key to the browser. When writing data with this client you
 * MUST set workspace_id + owner_id explicitly, because RLS will not do it.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

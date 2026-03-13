import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const ADMIN_EMAIL = "admin@mrm.com";
const CRON_SECRET = process.env.CRON_SYNC_SECRET;

type RequireAdminSuccess = {
  userId: string;
  email: string | null;
};

type RequireAdminResult = RequireAdminSuccess | { error: NextResponse };

export async function requireAdmin(request?: NextRequest): Promise<RequireAdminResult> {
  if (request && CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const headerToken = request.headers.get("x-cron-secret") ?? bearerToken;

    if (headerToken && headerToken === CRON_SECRET) {
      return { userId: "service", email: null };
    }
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .select("email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json(
        { success: false, error: "unable to load profile" },
        { status: 500 }
      ),
    };
  }

  const email = profile?.email ?? user.email ?? null;
  const isAdminEmail = email?.toLowerCase() === ADMIN_EMAIL;
  const isRoleAdmin = profile?.role === "admin";

  if (!isAdminEmail && !isRoleAdmin) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    userId: user.id,
    email,
  };
}

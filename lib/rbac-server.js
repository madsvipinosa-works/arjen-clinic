// lib/rbac-server.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN MATERNITY CLINIC: SERVER-SIDE RBAC & SESSION GUARDS
// Enforces principle of least privilege in Server Components and Server Actions.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { isStaff, canAccessClinicalRecords, canManageSystemSettings, canManageTriageQueue, canViewAuditLogs } from "./rbac";

/**
 * Enforces staff session in React Server Components / Pages.
 * Redirects unauthenticated users or non-staff to /admin/login.
 * 
 * @param {Function} [permissionCheck=isStaff] - Optional granular check (e.g. canAccessClinicalRecords)
 * @returns {Promise<{ user: object, role: string, supabase: object }>}
 */
export async function requireStaffSession(permissionCheck = isStaff) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user) {
    redirect("/admin/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = userData?.role || user?.app_metadata?.role || user?.user_metadata?.role;

  if (!role || !permissionCheck(role)) {
    redirect("/admin/login?error=Access Restricted: Insufficient privileges");
  }

  return { user, role, supabase };
}

/**
 * Verifies staff authorization in Server Actions without throwing unhandled redirects.
 * 
 * @param {Function} [permissionCheck=isStaff]
 * @returns {Promise<{ authorized: boolean, user: object|null, role: string|null, supabase: object, error: string|null }>}
 */
export async function verifyStaffAction(permissionCheck = isStaff) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user) {
    return { authorized: false, user: null, role: null, supabase, error: "Unauthorized: Active session required" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = userData?.role || user?.app_metadata?.role || user?.user_metadata?.role;

  if (!role || !permissionCheck(role)) {
    return { authorized: false, user, role, supabase, error: "Unauthorized: Insufficient clinical permissions" };
  }

  return { authorized: true, user, role, supabase, error: null };
}

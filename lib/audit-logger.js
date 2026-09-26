// lib/audit-logger.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN MATERNITY & LYING-IN CLINIC: IMMUTABLE DPA 2012 AUDIT LOGGER
// Compliance with Republic Act No. 10173 (Philippine Data Privacy Act of 2012)
// Logs access and modifications to Protected Health Information (PHI).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@/utils/supabase/server";

/**
 * Records an immutable audit log entry in public.audit_logs.
 * Non-blocking: will never crash the calling medical transaction if logging fails.
 * 
 * @param {object} params
 * @param {string} params.action - Action identifier e.g. 'LOG_PRENATAL_VISIT', 'REGISTER_WALKIN', 'EXPORT_CLINICAL_SUMMARY'
 * @param {string} params.entityType - Database table/entity e.g. 'patients', 'visit_logs', 'appointments'
 * @param {string|null} [params.entityId] - UUID of the target entity
 * @param {object} [params.details] - Structured metadata diff or parameters
 * @param {object|null} [params.userOverride] - Pre-fetched user object if available
 */
export async function logAuditEvent({
  action,
  entityType,
  entityId = null,
  details = {},
  userOverride = null,
}) {
  try {
    const supabase = await createClient();
    const user = userOverride || (await supabase.auth.getUser()).data?.user;

    let role = user?.app_metadata?.role || user?.user_metadata?.role;
    if (user?.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (userData?.role) {
        role = userData.role;
      }
    }

    await supabase.from("audit_logs").insert({
      user_id: user?.id || null,
      user_email: user?.email || "system",
      user_role: role || "unknown",
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (err) {
    // Non-blocking catch to ensure logging never breaks primary medical workflows
    console.error("[logAuditEvent] Audit logging failed:", err);
  }
}

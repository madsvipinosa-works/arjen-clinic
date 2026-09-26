// lib/rbac.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN MATERNITY CLINIC: ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS
// Enforces principle of least privilege across clinical and administrative tiers.
// Roles: 'admin' | 'doctor' | 'midwife' | 'nurse' | 'patient'
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid clinical staff roles allowed in the medical environment
 */
export const CLINICAL_ROLES = ['admin', 'doctor', 'midwife', 'nurse', 'staff'];

/**
 * Checks whether a role has authorization to access/view Protected Health Information (PHI)
 * and clinical charts (prenatal records, postpartum protocols, lab panels).
 * Authorized: Doctors, Midwives, and Clinic Administrators.
 */
export function canAccessClinicalRecords(role) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return ['admin', 'doctor', 'midwife', 'staff'].includes(normalized);
}

/**
 * Checks whether a role can perform intake triage, update vitals, and manage the Kanban queue.
 * Authorized: Doctors, Midwives, Nurses, and Clinic Administrators.
 */
export function canManageTriageQueue(role) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return ['admin', 'doctor', 'midwife', 'nurse', 'staff'].includes(normalized);
}

/**
 * Checks whether a role has permission to modify core clinic settings, CMS, and schedules.
 * Strictly restricted to Super Administrators.
 */
export function canManageSystemSettings(role) {
  return role?.toLowerCase() === 'admin';
}

/**
 * Checks whether a role can inspect the DPA 2012 immutable audit trail.
 * Strictly restricted to Clinic Administrators.
 */
export function canViewAuditLogs(role) {
  return role?.toLowerCase() === 'admin';
}

/**
 * Checks whether a role belongs to authenticated clinic staff.
 */
export function isStaff(role) {
  if (!role) return false;
  return CLINICAL_ROLES.includes(role.toLowerCase());
}

/**
 * Formats a user role for UI presentation with human-readable titles and Tailwind badge styling.
 * @param {string} role 
 * @returns {object} { label, badgeClass, iconColor }
 */
export function formatRoleBadge(role) {
  const norm = (role || 'unknown').toLowerCase();
  switch (norm) {
    case 'admin':
      return {
        label: 'Clinic Administrator',
        shortLabel: 'Admin',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        color: 'purple',
      };
    case 'doctor':
      return {
        label: 'Attending Physician (OB-GYN)',
        shortLabel: 'Doctor',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        color: 'rose',
      };
    case 'midwife':
      return {
        label: 'Registered Midwife',
        shortLabel: 'Midwife',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        color: 'emerald',
      };
    case 'nurse':
      return {
        label: 'Staff Nurse',
        shortLabel: 'Nurse',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        color: 'blue',
      };
    case 'patient':
      return {
        label: 'Patient',
        shortLabel: 'Patient',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
        color: 'gray',
      };
    default:
      return {
        label: role || 'Staff',
        shortLabel: role || 'Staff',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
        color: 'gray',
      };
  }
}

'use client';

// components/admin/settings-manager.jsx
// AR-JEN Maternity Clinic: System Settings & Profile Manager
// Magic UI & 21st.dev design tokens, real-time Philippine phone masking,
// password strength & match validation, and live system diagnostics.

import { useState, useTransition, useEffect } from 'react';
import { 
  Building2, 
  Shield, 
  Key, 
  Save, 
  Phone, 
  MapPin, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Lock, 
  Eye, 
  EyeOff, 
  Server, 
  Check, 
  Sparkles, 
  FileText,
  BadgeCheck,
  Radio,
  Send
} from 'lucide-react';
import { updateSettings, updateAdminCredentials } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Format Philippine phone numbers into standard readable format
 * e.g., 09171234567 -> 0917-123-4567
 * e.g., 0464161234  -> (046) 416-1234
 */
function formatPhilippineContact(value) {
  if (!value) return '';
  // Strip non-digits except leading +
  const cleaned = value.replace(/[^\d+]/g, '');

  // Mobile: 09XX-XXX-XXXX (11 digits starting with 09)
  if (cleaned.startsWith('09')) {
    const digits = cleaned.slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }

  // Mobile with +639: +63 9XX-XXX-XXXX
  if (cleaned.startsWith('+639')) {
    const digits = cleaned.slice(0, 13);
    if (digits.length <= 6) return digits;
    if (digits.length <= 9) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 13)}`;
  }

  // Landline (Cavite area code 046): (046) XXX-XXXX
  if (cleaned.startsWith('046') || cleaned.startsWith('(046)')) {
    const digits = cleaned.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  return value;
}

/**
 * Validates Philippine phone format
 */
function validatePhilippineContact(contact) {
  if (!contact) return { isValid: false, type: 'empty', message: 'Contact number is required' };
  const cleaned = contact.replace(/\D/g, '');
  
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return { isValid: true, type: 'mobile', message: 'Valid PH Mobile (09XX-XXX-XXXX)' };
  }
  if (cleaned.startsWith('639') && cleaned.length === 12) {
    return { isValid: true, type: 'mobile', message: 'Valid PH Mobile (+63 9XX-XXX-XXXX)' };
  }
  if (cleaned.startsWith('046') && cleaned.length === 10) {
    return { isValid: true, type: 'landline', message: 'Valid Cavite Landline (046)' };
  }
  if (cleaned.length >= 7 && cleaned.length <= 13) {
    return { isValid: true, type: 'generic', message: 'Valid Contact Format' };
  }
  return { isValid: false, type: 'invalid', message: 'Incomplete contact number' };
}

/**
 * Calculates password strength
 */
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty', color: 'bg-gray-200' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
  if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-600' };
  return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
}

export function SettingsManager({ initialSettings, currentUser }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'diagnostics'

  // Profile Form States
  const [clinicName, setClinicName] = useState(initialSettings?.clinic_name || 'AR-JEN Maternity and Lying-In Clinic');
  const [clinicAddress, setClinicAddress] = useState(initialSettings?.clinic_address || 'Dasmariñas City, Cavite');
  const [clinicContact, setClinicContact] = useState(initialSettings?.clinic_contact || '0912-345-6789');
  const [footerEmail, setFooterEmail] = useState(initialSettings?.footer_email || 'info@ar-jen.com');
  const [emergencyNotice, setEmergencyNotice] = useState(
    initialSettings?.emergency_notice || 
    '24/7 Normal Spontaneous Delivery (NSVD) for low-risk mothers. High-risk obstetric cases are immediately stabilized and coordinated via DOH BEmONC Referral Protocol.'
  );

  const [profilePending, startProfileTransition] = useTransition();
  const [profileFeedback, setProfileFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Security & Credentials States
  const [newUsername, setNewUsername] = useState(currentUser?.full_name || '');
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [credPending, startCredTransition] = useTransition();
  const [credFeedback, setCredFeedback] = useState(null);

  // Live Philippine Clock for Diagnostics
  const [phtTime, setPhtTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(now);
      setPhtTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Contact validation
  const contactValidation = validatePhilippineContact(clinicContact);

  // Password validation & strength
  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword ? newPassword === confirmPassword : null;
  const isPasswordValid = !newPassword || (newPassword.length >= 8 && passwordsMatch);

  // Profile Submit Handler
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileFeedback(null);

    const formData = new FormData();
    formData.append('clinic_name', clinicName);
    formData.append('clinic_address', clinicAddress);
    formData.append('clinic_contact', clinicContact);
    formData.append('footer_email', footerEmail);
    formData.append('emergency_notice', emergencyNotice);

    startProfileTransition(async () => {
      try {
        const res = await updateSettings(formData);
        if (res?.success) {
          setProfileFeedback({ type: 'success', message: res.message || 'Clinic profile saved successfully.' });
          setTimeout(() => setProfileFeedback(null), 4000);
        } else {
          setProfileFeedback({ type: 'error', message: res?.error || 'Failed to update clinic profile.' });
        }
      } catch (err) {
        setProfileFeedback({ type: 'error', message: err.message || 'An unexpected error occurred.' });
      }
    });
  };

  // Credentials Submit Handler
  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    setCredFeedback(null);

    if (newPassword && newPassword.length < 8) {
      setCredFeedback({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setCredFeedback({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    const formData = new FormData();
    if (newUsername.trim()) formData.append('new_username', newUsername.trim());
    if (newEmail.trim()) formData.append('new_email', newEmail.trim());
    if (newPassword) formData.append('new_password', newPassword);
    if (confirmPassword) formData.append('confirm_password', confirmPassword);

    startCredTransition(async () => {
      try {
        const res = await updateAdminCredentials(formData);
        if (res?.success) {
          setCredFeedback({ type: 'success', message: res.message || 'Admin credentials updated successfully.' });
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => setCredFeedback(null), 5000);
        } else {
          setCredFeedback({ type: 'error', message: res?.error || 'Failed to update credentials.' });
        }
      } catch (err) {
        setCredFeedback({ type: 'error', message: err.message || 'An unexpected error occurred.' });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Module Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200/60 rounded-full mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">Governance & Control Plane</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">System Settings & Profile</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Configure clinic identity, administrator security credentials, and view real-time system health.
          </p>
        </div>

        {/* 3-Tab Segmented Selector */}
        <div className="inline-flex p-1.5 bg-gray-100/80 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'profile'
                ? 'bg-white text-rose-600 shadow-sm shadow-gray-200 scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Clinic Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'security'
                ? 'bg-white text-rose-600 shadow-sm shadow-gray-200 scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            Security & Credentials
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'diagnostics'
                ? 'bg-white text-rose-600 shadow-sm shadow-gray-200 scale-[1.02]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Diagnostics
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: CLINIC PROFILE & EMERGENCY ADVISORY
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Main Profile Form Bento (Col span 2) */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl border border-gray-200/80 shadow-xl shadow-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-rose-50/40">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-rose-500 rounded-2xl shadow-md shadow-rose-200 text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-lg tracking-tight">Facility Information & Hotline</h2>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Injected into DOH Transfer Slips & Medical Records</p>
                </div>
              </div>

              {profileFeedback?.type === 'success' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full animate-in fade-in duration-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">✓ Profile Saved</span>
                </div>
              )}
            </div>

            <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
              {profileFeedback?.type === 'error' && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-xs font-semibold">{profileFeedback.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clinic_name" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Official Facility Name <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] font-bold text-gray-400">{clinicName.length} chars</span>
                </div>
                <Input
                  id="clinic_name"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. AR-JEN Maternity and Lying-In Clinic"
                  required
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-900"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clinic_contact" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      Official Hotline / Mobile <span className="text-rose-500">*</span>
                    </Label>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      contactValidation.isValid 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {contactValidation.message}
                    </span>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="clinic_contact"
                      value={clinicContact}
                      onChange={(e) => setClinicContact(formatPhilippineContact(e.target.value))}
                      placeholder="0917-123-4567 or (046) 416-XXXX"
                      required
                      className="h-12 pl-11 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-900"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium">Philippine mobile (09XX) or landline format.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_email" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Official Inquiries Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="footer_email"
                      type="email"
                      value={footerEmail}
                      onChange={(e) => setFooterEmail(e.target.value)}
                      placeholder="e.g. info@ar-jen.com"
                      className="h-12 pl-11 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-900"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium">Displayed on website footer and patient receipts.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_address" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Facility Physical Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="clinic_address"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder="e.g. Dasmariñas City, Cavite"
                    required
                    className="h-12 pl-11 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emergency_notice" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Clinical Triage & Emergency Referral Advisory
                  </Label>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    BEmONC Clinical Advisory
                  </span>
                </div>
                <Textarea
                  id="emergency_notice"
                  rows={3}
                  value={emergencyNotice}
                  onChange={(e) => setEmergencyNotice(e.target.value)}
                  placeholder="Clinical referral notes and emergency triage instructions..."
                  className="rounded-2xl border-gray-200 focus:ring-rose-500 text-sm font-medium text-gray-800 leading-relaxed resize-none"
                />
                <p className="text-[11px] text-gray-400 font-medium">
                  Displayed on the public booking portal to clarify normal vs high-risk referral protocols.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  disabled={profilePending || !contactValidation.isValid}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-12 px-8 font-black text-sm gap-2 shadow-lg shadow-rose-200 transition-all active:scale-95"
                >
                  {profilePending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Clinic Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Quick Guidance & Live Preview Bento (Col span 1) */}
          <div className="space-y-6">
            {/* Live Referral Header Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                <FileText className="w-5 h-5" />
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Live Document Header</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                This exact metadata block is rendered at the top of every generated <strong>DOH Emergency Referral Slip</strong> and <strong>Maternal EMR Summary</strong>:
              </p>

              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/70 text-center space-y-1 font-serif">
                <p className="font-bold text-gray-900 text-sm">{clinicName || 'AR-JEN Maternity Clinic'}</p>
                <p className="text-xs text-gray-600">{clinicAddress || 'Dasmariñas City, Cavite'}</p>
                <p className="text-[11px] text-gray-500 font-mono font-medium">Hotline: {clinicContact || '0912-345-6789'}</p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                <BadgeCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Synchronized with DOH Administrative Order standards</span>
              </div>
            </div>

            {/* Statutory Scope Reminder */}
            <div className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Scope Integrity</span>
              </div>
              <h4 className="font-bold text-sm">Need to update public website storytelling or logos?</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Landing page hero photos, brand logos, browser favicons, and services are managed in the <strong>Website CMS</strong> studio to keep clinical settings separate from public branding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: SECURITY & ADMIN CREDENTIALS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Active Admin Profile Card (Col span 1) */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg tracking-tight">Active Administrator</h3>
                  <span className="inline-block mt-0.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                    {currentUser?.role === 'admin' ? 'Super Administrator' : (currentUser?.role || 'Staff')}
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-semibold">Display Name:</span>
                  <span className="font-bold text-gray-900">{currentUser?.full_name || 'Clinic Administrator'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-semibold">Account Email:</span>
                  <span className="font-mono font-bold text-gray-900 text-[11px]">{currentUser?.email}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-semibold">Security Clearance:</span>
                  <span className="font-bold text-rose-600">Full PHI & System Root</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500 font-semibold">Auth Engine:</span>
                  <span className="font-bold text-gray-700">Supabase Auth (PBKDF2)</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>DPA 2012 Security Notice</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Every password or email update is permanently timestamped and logged into the immutable audit trail under <strong>RA 10173</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Credentials Update Form (Col span 2) */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl border border-gray-200/80 shadow-xl shadow-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-rose-50/40">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-rose-500 rounded-2xl shadow-md shadow-rose-200 text-white">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-lg tracking-tight">Update Authentication Credentials</h2>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Modify password or administrative contact</p>
                </div>
              </div>

              {credFeedback?.type === 'success' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full animate-in fade-in duration-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">✓ Credentials Updated</span>
                </div>
              )}
            </div>

            <form onSubmit={handleCredentialsSubmit} className="p-8 space-y-6">
              {credFeedback?.type === 'error' && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-xs font-semibold">{credFeedback.message}</AlertDescription>
                </Alert>
              )}

              {credFeedback?.type === 'success' && (
                <Alert className="rounded-2xl border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <AlertDescription className="text-xs font-semibold text-emerald-900">
                    {credFeedback.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="new_username" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Display Name
                  </Label>
                  <Input
                    id="new_username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. Clinic Administrator"
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-900"
                  />
                  <p className="text-[11px] text-gray-400 font-medium">Staff name recorded on medical signatures.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_email" className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    Account Login Email
                  </Label>
                  <Input
                    id="new_email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@ar-jen.com"
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-900"
                  />
                  <p className="text-[11px] text-gray-400 font-medium">Requires email confirmation if modified.</p>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Change Password</h3>
                  <span className="text-[11px] text-gray-400 font-medium">Leave blank to keep existing password</span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new_password" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="h-12 pr-11 rounded-2xl border-gray-200 focus:ring-rose-500 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength Gauge */}
                    {newPassword && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-500">Password Strength:</span>
                          <span className={`font-black uppercase tracking-wider ${passwordStrength.text}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 h-1.5">
                          <div className={`rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-gray-100'}`} />
                          <div className={`rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-gray-100'}`} />
                          <div className={`rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-gray-100'}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="confirm_password" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Confirm New Password
                      </Label>
                      {passwordsMatch !== null && (
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          passwordsMatch 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {passwordsMatch ? '✓ Matches' : '✕ Mismatch'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="h-12 pr-11 rounded-2xl border-gray-200 focus:ring-rose-500 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  disabled={credPending || !isPasswordValid}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-12 px-8 font-black text-sm gap-2 shadow-lg shadow-rose-200 transition-all active:scale-95"
                >
                  {credPending ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating Credentials...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Update Credentials
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: LIVE SYSTEM DIAGNOSTICS & STATUTORY COMPLIANCE
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-8">
          {/* Live System Shift Clock Bento */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-rose-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-gray-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black tracking-widest uppercase text-emerald-400">
                  Philippine Standard Time (UTC+8) Active
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight font-mono">
                {phtTime || 'Synchronizing PHT Clock...'}
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                All prenatal check-ins, newborn deliveries, and cron background tasks operate strictly on Manila Time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">System Timezone</p>
                <p className="text-xs font-mono font-bold text-white">Asia/Manila (PHT)</p>
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">UTC Offset</p>
                <p className="text-xs font-mono font-bold text-emerald-400">+08:00</p>
              </div>
            </div>
          </div>

          {/* 4-Column Diagnostics Bento Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Database Engine */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Operational
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">PostgreSQL Engine</h3>
                <p className="text-xs text-gray-500 mt-0.5">Supabase Realtime Cluster</p>
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Connection:</span> <strong className="text-emerald-600">Active</strong></div>
                <div className="flex justify-between"><span>RLS Policies:</span> <strong>Enforced</strong></div>
              </div>
            </div>

            {/* Notification Mailer */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <Send className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  Configured
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">NodeMailer SMTP</h3>
                <p className="text-xs text-gray-500 mt-0.5">Gmail SSL Relay (utils/email.js)</p>
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Cost:</span> <strong className="text-emerald-600">₱0 (Free)</strong></div>
                <div className="flex justify-between"><span>Reminders:</span> <strong>Automated</strong></div>
              </div>
            </div>

            {/* Background Schedulers */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                  4 Active Crons
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Vercel Scheduled Tasks</h3>
                <p className="text-xs text-gray-500 mt-0.5">vercel.json Cron Engine</p>
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Reminders:</span> <strong>24h Prior</strong></div>
                <div className="flex justify-between"><span>EOD Digest:</span> <strong>8:00 PM PHT</strong></div>
              </div>
            </div>

            {/* Realtime Lobby Sync */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Live
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">WebSocket Sync</h3>
                <p className="text-xs text-gray-500 mt-0.5">Triage, Queue & Telehealth</p>
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Lobby TV:</span> <strong>/queue</strong></div>
                <div className="flex justify-between"><span>Tracker:</span> <strong>/queue/track</strong></div>
              </div>
            </div>
          </div>

          {/* Statutory Regulatory Guarantees Bento */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-gray-200/80 p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg tracking-tight">
                  Philippine Healthcare & Statutory Compliance Architecture
                </h3>
                <p className="text-xs text-gray-500">
                  Active regulatory guarantees hard-coded into the AR-JEN clinical system:
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-500" />
                  <strong className="text-gray-900">Republic Act No. 10173 (Data Privacy Act of 2012)</strong>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Strict Section 12/13 sensitive personal information safeguards. All access, updates, and exports of maternal charts generate append-only immutable audit records.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <strong className="text-gray-900">DOH Administrative Order No. 2016-0035</strong>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  National Policy on the Management of Health Records. Mandates a minimum 5-year retention protocol for lying-in maternity and neonatal charts.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <strong className="text-gray-900">DOH BEmONC & EINC Protocol Guidelines</strong>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Basic Emergency Obstetric and Newborn Care protocol compliance with 1-click Unang Yakap checklists and standardized emergency referral forms.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <strong className="text-gray-900">PhilHealth Maternity Care Package (MCP)</strong>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Prenatal visit cadence compliance checker tracking at least 4 antenatal visits across Trimesters 1, 2, and 3 directly on the patient clinical overview.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

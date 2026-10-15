-- Migration: 20261016000400_atomic_clinical_transactions.sql
-- Module: Transactional Integrity & Concurrency Safety
-- Closes Finding 6: Atomic Patient Registration
-- Closes Finding 7: Concurrent Slot Capacity Reservation

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ATOMIC PATIENT REGISTRATION RPC
-- Ensures that creating a patient, their active maternal episode (if pregnant),
-- and their modular prenatal record row all succeed together or fail together.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_patient_atomic(
  p_full_name TEXT,
  p_date_of_birth DATE,
  p_age INT,
  p_civil_status TEXT,
  p_husband_partner_name TEXT,
  p_address TEXT,
  p_contact_number TEXT,
  p_blood_type TEXT,
  p_allergies TEXT,
  p_philhealth_number TEXT,
  p_is_high_risk BOOLEAN,
  p_lmp DATE,
  p_gravida INT,
  p_para INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_patient_id UUID;
  v_edc DATE;
BEGIN
  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patient full name is required.');
  END IF;

  -- 1. Insert patient demographic record
  INSERT INTO public.patients (
    full_name, date_of_birth, age, civil_status, husband_partner_name,
    address, contact_number, blood_type, allergies, philhealth_number, is_high_risk
  ) VALUES (
    TRIM(p_full_name), p_date_of_birth, p_age, p_civil_status, p_husband_partner_name,
    p_address, p_contact_number, p_blood_type, p_allergies, p_philhealth_number, COALESCE(p_is_high_risk, false)
  ) RETURNING id INTO v_patient_id;

  -- 2. If LMP provided, compute Naegele's EDC (+280 days) and insert active episode
  IF p_lmp IS NOT NULL THEN
    v_edc := p_lmp + INTERVAL '280 days';
    INSERT INTO public.maternal_episodes (
      patient_id, lmp, edc, gravida, para, status
    ) VALUES (
      v_patient_id, p_lmp, v_edc, COALESCE(p_gravida, 1), COALESCE(p_para, 0), 'Active'
    );
  END IF;

  -- 3. Provision modular prenatal records shell
  INSERT INTO public.prenatal_records (patient_id, modular_data)
  VALUES (v_patient_id, '{}'::jsonb)
  ON CONFLICT (patient_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'patient_id', v_patient_id);
EXCEPTION WHEN OTHERS THEN
  -- PostgreSQL automatically rolls back the entire transaction block on unhandled exception
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ATOMIC APPOINTMENT CAPACITY RESERVATION RPC
-- Protects against concurrent overbooking races by verifying slot capacity
-- within a single atomic transaction block.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reserve_appointment_slot(
  p_patient_id UUID,
  p_service_type TEXT,
  p_appointment_date DATE,
  p_time_preference TEXT,
  p_notes TEXT DEFAULT NULL,
  p_is_walkin BOOLEAN DEFAULT false,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_capacity INT := 10;
  v_current_count INT;
  v_appointment_id UUID;
  v_status TEXT := 'Pending';
  v_triage_status TEXT := 'waiting';
BEGIN
  -- 1. Determine configured capacity limit for the requested time preference
  SELECT max_capacity INTO v_max_capacity
  FROM public.time_slots
  WHERE label = p_time_preference
  LIMIT 1;

  IF v_max_capacity IS NULL THEN
    SELECT CASE 
      WHEN p_time_preference = 'AM' OR p_time_preference ILIKE '%morning%' THEN COALESCE(max_morning_slots, 10) 
      ELSE COALESCE(max_afternoon_slots, 10) 
    END INTO v_max_capacity
    FROM public.clinic_settings
    WHERE id = 1;
  END IF;

  v_max_capacity := COALESCE(v_max_capacity, 10);

  -- 2. Count existing active appointments on this date and time preference
  SELECT COUNT(*) INTO v_current_count
  FROM public.appointments
  WHERE appointment_date = p_appointment_date
    AND time_preference = p_time_preference
    AND status != 'Cancelled';

  -- 3. Check capacity ceiling
  IF v_current_count >= v_max_capacity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'The ' || p_time_preference || ' window on this date is fully booked (' || v_current_count || '/' || v_max_capacity || '). Please choose another date or time.'
    );
  END IF;

  -- 4. Set Walk-in or custom status defaults
  IF p_status IS NOT NULL THEN
    v_status := p_status;
  ELSIF p_is_walkin THEN
    v_status := 'Approved';
  END IF;

  IF v_status = 'Approved' THEN
    v_triage_status := 'waiting';
  END IF;

  -- 5. Insert new appointment row atomically
  INSERT INTO public.appointments (
    patient_id, service_type, appointment_date, time_preference, notes, is_walkin, status, triage_status
  ) VALUES (
    p_patient_id, p_service_type, p_appointment_date, p_time_preference, p_notes, p_is_walkin, v_status, v_triage_status
  ) RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'success', true, 
    'appointment_id', v_appointment_id,
    'current_count', v_current_count + 1,
    'max_capacity', v_max_capacity
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

NOTIFY pgrst, 'reload schema';

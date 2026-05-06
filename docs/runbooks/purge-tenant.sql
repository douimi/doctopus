-- ⚠ DESTRUCTIVE — completely purges a single cabinet (tenant) and every
-- row that depends on it: consultations, prescriptions, appointments,
-- patients, audit log, AI chat history, credit ledger, invites, member
-- profiles, and the auth users that belonged to the cabinet.
--
-- Walks the FK graph in reverse so all foreign keys (configured ON DELETE
-- RESTRICT) clear cleanly before we delete tenants. Wrapped in a single
-- transaction — if any step fails the whole purge rolls back.
--
-- USAGE:
--   1. Open Supabase dashboard → SQL Editor.
--   2. Replace the v_tenant_id value below with the cabinet you want to wipe.
--   3. Run. The DO block prints NOTICEs of what it cleared.
--
-- NOT INCLUDED (these are NOT in postgres — clean separately):
--   - Storage objects in the `cabinet-assets` bucket
--     (logo, signature, stamp). Delete via Supabase dashboard
--     → Storage → cabinet-assets → search by tenant id.
--   - The medications + medication_imports tables — those are platform-
--     wide, not tenant-scoped. Don't touch.

BEGIN;

DO $$
DECLARE
  -- ⬇  CHANGE ME ⬇
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000000';

  v_tenant_name text;
  v_user_ids uuid[];
  v_n int;
BEGIN
  -- Sanity check: abort if the tenant doesn't exist.
  SELECT name INTO v_tenant_name FROM tenants WHERE id = v_tenant_id;
  IF v_tenant_name IS NULL THEN
    RAISE EXCEPTION 'Tenant % not found — aborting purge.', v_tenant_id;
  END IF;
  RAISE NOTICE 'Purging cabinet "%" (id %)…', v_tenant_name, v_tenant_id;

  -- Capture user ids so we can drop the auth accounts at the end.
  SELECT array_agg(id) INTO v_user_ids
    FROM user_profiles WHERE tenant_id = v_tenant_id;

  -- 1. AI: chat messages, usage logs, credit ledger
  DELETE FROM consultation_chat_messages WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  consultation_chat_messages: %', v_n;

  DELETE FROM chatbot_usage              WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  chatbot_usage: %', v_n;

  DELETE FROM chatbot_credit_ledger      WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  chatbot_credit_ledger: %', v_n;

  -- 2. Prescriptions
  DELETE FROM prescription_items         WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  prescription_items: %', v_n;

  DELETE FROM prescriptions              WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  prescriptions: %', v_n;

  -- 3. Consultation vitals + consultations
  DELETE FROM consultation_vitals        WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  consultation_vitals: %', v_n;

  DELETE FROM consultations              WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  consultations: %', v_n;

  -- 4. Appointments
  DELETE FROM appointments               WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  appointments: %', v_n;

  -- 5. Patients (allergies + chronic conditions + base table)
  DELETE FROM patient_allergies          WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  patient_allergies: %', v_n;

  DELETE FROM patient_chronic_conditions WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  patient_chronic_conditions: %', v_n;

  DELETE FROM patients                   WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  patients: %', v_n;

  -- 6. Audit log
  DELETE FROM audit_log                  WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  audit_log: %', v_n;

  -- 7. Invites (also cascades from tenants DELETE, but explicit is cleaner)
  DELETE FROM tenant_invites             WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  tenant_invites: %', v_n;

  -- 8. User profiles
  DELETE FROM user_profiles              WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  user_profiles: %', v_n;

  -- 9. Auth users that belonged to this cabinet (Supabase auth schema)
  IF v_user_ids IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
    GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  auth.users: %', v_n;
  END IF;

  -- 10. The tenant itself
  DELETE FROM tenants                    WHERE id = v_tenant_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;  RAISE NOTICE '  tenants: %', v_n;

  RAISE NOTICE 'Cabinet "%" purged.', v_tenant_name;
END $$;

COMMIT;

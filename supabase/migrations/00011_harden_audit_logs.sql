-- Migration 00011: Make audit logs server-trusted

-- Application audit events are written by authenticated server actions using
-- the service-role client. Candidates must not be able to forge audit records.
DROP POLICY IF EXISTS "Candidates insert own audit logs" ON audit_logs;

CREATE POLICY "Candidates view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = candidate_id);

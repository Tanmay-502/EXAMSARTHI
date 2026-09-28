import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@supabase/supabase-js'

export type AuditEntry = {
  session_id?: string | null
  candidate_id?: string | null
  action: string
  metadata?: Json
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const adminClient = await createAdminClient()
    const { error } = await adminClient.from('audit_logs').insert(entry)
    if (error) console.error('[AUDIT] writeAudit failed:', error.message)
  } catch (error) {
    console.error('[AUDIT] writeAudit failed:', error)
  }
}

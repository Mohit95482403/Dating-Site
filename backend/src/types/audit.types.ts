// Audit Log Domain Types

export interface AuditLogRow {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

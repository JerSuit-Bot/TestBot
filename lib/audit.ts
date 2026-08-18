import { createAuditLog, type AuditEntry } from './services';

export async function auditLog(entry: AuditEntry): Promise<void> {
  await createAuditLog(entry);
}

export type { AuditEntry };

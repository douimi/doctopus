import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { dbAdmin } from '@/db/client';
import { tenantInvites, userProfiles } from '@/db/schema';

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: 'doctor' | 'assistant';
  isActive: boolean;
  createdAt: Date;
};

export type PendingInvite = {
  id: string;
  emailHint: string | null;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
};

export async function listTeamMembers(tenantId: string): Promise<TeamMember[]> {
  const rows = await dbAdmin()
    .select({
      id: userProfiles.id,
      fullName: userProfiles.fullName,
      email: userProfiles.email,
      role: userProfiles.role,
      isActive: userProfiles.isActive,
      createdAt: userProfiles.createdAt,
    })
    .from(userProfiles)
    .where(eq(userProfiles.tenantId, tenantId));
  // Doctor first, then assistants by created date.
  return rows
    .map((r) => ({ ...r, role: r.role as 'doctor' | 'assistant' }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'doctor' ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
}

export async function listPendingAssistantInvites(
  tenantId: string,
): Promise<PendingInvite[]> {
  const rows = await dbAdmin()
    .select({
      id: tenantInvites.id,
      emailHint: tenantInvites.emailHint,
      createdAt: tenantInvites.createdAt,
      expiresAt: tenantInvites.expiresAt,
    })
    .from(tenantInvites)
    .where(
      and(
        eq(tenantInvites.tenantId, tenantId),
        eq(tenantInvites.kind, 'assistant'),
        isNull(tenantInvites.consumedAt),
        isNull(tenantInvites.revokedAt),
      ),
    )
    .orderBy(desc(tenantInvites.createdAt));
  const now = Date.now();
  return rows.map((r) => ({ ...r, isExpired: r.expiresAt.getTime() < now }));
}

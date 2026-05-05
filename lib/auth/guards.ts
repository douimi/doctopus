import 'server-only';
import { redirect } from 'next/navigation';
import { requireSession, type Session } from './session';

export async function requireDoctor(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== 'doctor') redirect('/today');
  return s;
}

export async function requireAssistant(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== 'assistant') redirect('/today');
  return s;
}

export async function requireAuth(): Promise<Session> {
  return requireSession();
}

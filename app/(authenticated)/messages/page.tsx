import { Suspense } from 'react';
import { requireSession } from '@/lib/auth/session';
import { MessagesWorkspace } from '@/components/messaging/messages-workspace';

/**
 * Cabinet messaging, full page. Both roles. All data comes from the
 * MessagingProvider mounted in the shell (already bootstrapped and live),
 * so this page only lays out the list + thread.
 */
export default async function MessagesPage() {
  await requireSession();
  return (
    <Suspense>
      <MessagesWorkspace />
    </Suspense>
  );
}

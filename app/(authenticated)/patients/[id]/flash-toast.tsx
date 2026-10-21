'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/toast';

/**
 * Shows a success toast after a server-side redirect (`?created=1`,
 * `?saved=1`), then strips the flag so a refresh doesn't replay it.
 */
export function FlashToast({ title, description }: { title: string; description?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Next tick: on a hard load the shell's <Toaster> (a parent) registers
    // its listener after this child effect runs.
    const t = setTimeout(() => {
      showToast({ id: `flash-${pathname}`, variant: 'success', title, description });
      router.replace(pathname, { scroll: false });
    }, 0);
    return () => clearTimeout(t);
  }, [router, pathname, title, description]);
  return null;
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;

export function LiveSearchInput({
  defaultQuery,
  placeholder,
  paramName = 'q',
  className,
}: {
  defaultQuery: string;
  placeholder: string;
  paramName?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultQuery);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push debounced URL updates. When the user clears the input, remove the
  // param entirely so URLs stay clean.
  useEffect(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        next.delete(paramName);
      } else {
        next.set(paramName, trimmed);
      }
      const qs = next.toString();
      const url = qs.length > 0 ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative flex-1 min-w-[240px] max-w-md', className)}>
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}

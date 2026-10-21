'use client';

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const itemClass =
  'flex h-10 cursor-default select-none items-center gap-2 rounded-md px-2.5 text-body text-foreground outline-none data-highlighted:bg-muted lg:h-9';

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export type OverflowItem =
  | { kind: 'link'; label: string; href: string; icon?: Icon }
  | { kind: 'action'; label: string; onSelect: () => void; icon?: Icon; danger?: boolean }
  | { kind: 'separator' };

/**
 * "⋯" menu for secondary and destructive row/page actions, so they never
 * sit one mis-tap away from the primary button (UX brief P-8, §6.1).
 * Destructive items should open a ConfirmDialog, not act directly.
 */
export function OverflowMenu({
  label,
  items,
  triggerClassName,
  triggerSize = 'icon-sm',
  triggerVariant = 'ghost',
  children,
}: {
  /** Accessible name of the trigger, e.g. "Plus d'actions pour Tazi Salma". */
  label: string;
  items: OverflowItem[];
  triggerClassName?: string;
  triggerSize?: 'icon-sm' | 'icon' | 'sm' | 'default';
  triggerVariant?: 'ghost' | 'secondary';
  /** Trigger content for labelled triggers (defaults to a ⋯ icon). */
  children?: ReactNode;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            size={triggerSize}
            aria-label={label}
            title={children ? undefined : label}
            className={triggerClassName}
          />
        }
      >
        {children ?? <MoreHorizontal aria-hidden />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="min-w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-popover outline-none">
            {items.map((item, i) => {
              if (item.kind === 'separator') {
                return <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-border" />;
              }
              const ItemIcon = item.icon;
              if (item.kind === 'link') {
                return (
                  <Menu.LinkItem key={item.label} render={<Link href={item.href} />} className={itemClass}>
                    {ItemIcon ? <ItemIcon className="size-4 text-muted-foreground" aria-hidden /> : null}
                    {item.label}
                  </Menu.LinkItem>
                );
              }
              return (
                <Menu.Item
                  key={item.label}
                  onClick={item.onSelect}
                  className={cn(
                    itemClass,
                    item.danger && 'text-danger-ink data-highlighted:bg-danger-tint',
                  )}
                >
                  {ItemIcon ? (
                    <ItemIcon
                      className={cn('size-4', item.danger ? 'text-danger-ink' : 'text-muted-foreground')}
                      aria-hidden
                    />
                  ) : null}
                  {item.label}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

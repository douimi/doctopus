import type { ReactNode } from 'react';
import { WHATSAPP_URL } from './contact';
import { WhatsAppIcon } from './whatsapp-icon';

/**
 * Outbound WhatsApp link. Opens a new tab, so screen-reader users are told
 * where they are going ("ouvre WhatsApp").
 */
export function WhatsAppLink({
  className,
  children,
  iconClassName = 'size-4',
}: {
  className?: string;
  children: ReactNode;
  iconClassName?: string;
}) {
  return (
    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={className}>
      <WhatsAppIcon className={iconClassName} />
      {children}
      <span className="sr-only"> (ouvre WhatsApp dans un nouvel onglet)</span>
    </a>
  );
}

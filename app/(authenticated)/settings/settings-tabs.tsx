import { SegmentedControl, SegmentedControlLink } from '@/components/ui/segmented-control';

export type SettingsTab = 'cabinet' | 'team' | 'audit';

const TABS: ReadonlyArray<{ key: SettingsTab; href: string; label: string }> = [
  { key: 'cabinet', href: '/settings/cabinet', label: 'Cabinet' },
  { key: 'team', href: '/settings/team', label: 'Équipe' },
  { key: 'audit', href: '/settings/audit', label: 'Journal' },
];

/** Sub-navigation shared by every Paramètres page (one sidebar entry). */
export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <SegmentedControl label="Sections des paramètres">
      {TABS.map((t) => (
        <SegmentedControlLink key={t.key} href={t.href} active={t.key === active}>
          {t.label}
        </SegmentedControlLink>
      ))}
    </SegmentedControl>
  );
}

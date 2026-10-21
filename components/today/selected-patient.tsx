import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export type FlowPatient = {
  id: string;
  fullName: string;
  ageLabel: string;
  phone?: string | null;
};

/** Patient summary row at the top of the RDV / walk-in forms. */
export function SelectedPatient({
  patient,
  onChange,
}: {
  patient: FlowPatient;
  onChange?: () => void;
}) {
  const meta = [patient.ageLabel, patient.phone].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5">
      <Avatar name={patient.fullName} size="md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-medium text-foreground">{patient.fullName}</div>
        {meta ? <div className="truncate text-small text-muted-foreground tabular-nums">{meta}</div> : null}
      </div>
      {onChange ? (
        <Button type="button" size="xs" variant="ghost" onClick={onChange}>
          Changer
        </Button>
      ) : null}
    </div>
  );
}

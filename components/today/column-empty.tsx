/** Quiet, compact empty state for one column of the /today board. */
export function ColumnEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="panel px-4 py-6 text-center">
      <p className="text-body font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-xs text-small text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

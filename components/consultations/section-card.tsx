export function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-md border" open>
      <summary className="cursor-pointer list-none px-3 py-2 font-medium border-b flex items-center justify-between">
        <span>{title}</span>
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
      </summary>
      <div className="p-3">{children}</div>
    </details>
  );
}

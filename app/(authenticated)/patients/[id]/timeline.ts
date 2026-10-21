import type { Consultation } from '@/db/schema';

export type TimelineItem = Pick<Consultation, 'id' | 'parentConsultationId' | 'consultedAt'>;

export type TimelineNode<T extends TimelineItem> = { c: T; children: T[] };

/**
 * Groups follow-ups under their parent (newest parent first, follow-ups
 * oldest → newest under it). A follow-up whose parent isn't in the list
 * (deleted, or parent of another patient by data drift) is shown as a
 * root so nothing disappears.
 */
export function buildTimeline<T extends TimelineItem>(items: T[]): TimelineNode<T>[] {
  const byId = new Map(items.map((c) => [c.id, c]));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  for (const c of items) {
    const parentId = c.parentConsultationId;
    if (parentId && byId.has(parentId) && parentId !== c.id) {
      const list = children.get(parentId) ?? [];
      list.push(c);
      children.set(parentId, list);
    } else {
      roots.push(c);
    }
  }
  // Flatten deeper chains (suivi of a suivi) under the top-level root.
  const collect = (id: string, seen: Set<string>): T[] => {
    const direct = children.get(id) ?? [];
    const out: T[] = [];
    for (const d of direct) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push(d, ...collect(d.id, seen));
    }
    return out;
  };
  const visited = new Set<string>();
  const build = (c: T): TimelineNode<T> => {
    visited.add(c.id);
    const kids = collect(c.id, new Set([c.id]));
    for (const k of kids) visited.add(k.id);
    return {
      c,
      children: kids.sort((a, b) => a.consultedAt.getTime() - b.consultedAt.getTime()),
    };
  };
  const nodes = roots.map(build);
  // A parent cycle (A → B → A) has no root; surface those rows anyway.
  for (const c of items) if (!visited.has(c.id)) nodes.push(build(c));
  return nodes.sort((a, b) => b.c.consultedAt.getTime() - a.c.consultedAt.getTime());
}


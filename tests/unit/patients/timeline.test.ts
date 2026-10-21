import { describe, expect, it } from 'vitest';
import { buildTimeline } from '@/app/(authenticated)/patients/[id]/timeline';

const c = (id: string, day: number, parent: string | null = null) => ({
  id,
  parentConsultationId: parent,
  consultedAt: new Date(2026, 9, day),
});

describe('buildTimeline', () => {
  it('nests follow-ups under their parent, newest parent first', () => {
    const nodes = buildTimeline([c('b', 20), c('a', 1), c('a2', 10, 'a'), c('a1', 5, 'a')]);
    expect(nodes.map((n) => n.c.id)).toEqual(['b', 'a']);
    expect(nodes[1].children.map((x) => x.id)).toEqual(['a1', 'a2']);
  });

  it('flattens a suivi of a suivi under the root', () => {
    const nodes = buildTimeline([c('a', 1), c('a1', 5, 'a'), c('a11', 9, 'a1')]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].children.map((x) => x.id)).toEqual(['a1', 'a11']);
  });

  it('keeps orphans and cycles visible', () => {
    const nodes = buildTimeline([c('x', 3, 'missing'), c('p', 1, 'q'), c('q', 2, 'p')]);
    const all = nodes.flatMap((n) => [n.c.id, ...n.children.map((k) => k.id)]);
    expect(all.sort()).toEqual(['p', 'q', 'x']);
  });
});

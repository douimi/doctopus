// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/ui/stat-card';
import { StatCard as AdminStatCard } from '@/components/admin/stat-card';

describe('StatCard', () => {
  it('renders label, value, hint and a month-over-month delta', () => {
    render(
      <StatCard
        label="Recettes"
        value="1 200 MAD"
        hint="4 consultations payées"
        comparison={{ ratio: 0.12, label: 'vs sept.', previous: '1 071 MAD' }}
      />,
    );
    expect(screen.getByText('Recettes')).toBeInTheDocument();
    expect(screen.getByText('1 200 MAD')).toBeInTheDocument();
    expect(screen.getByText('4 consultations payées')).toBeInTheDocument();
    expect(screen.getByText('+12 %')).toBeInTheDocument();
  });

  it('is a link only when href is set', () => {
    const { container, rerender } = render(<StatCard label="A" value="1" />);
    expect(container.querySelector('a')).toBeNull();
    rerender(<StatCard label="A" value="1" href="/today" />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/today');
  });

  it('keeps the admin re-export working', () => {
    render(<AdminStatCard tone="admin" label="Cabinets" value="3" />);
    expect(screen.getByText('3').className).toMatch(/text-admin-ink/);
  });
});

// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge', () => {
  it('renders children with default variant (neutral)', () => {
    render(<StatusBadge>actif</StatusBadge>);
    const el = screen.getByText('actif');
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/bg-muted/);
  });

  it.each([
    ['success', /bg-success-tint/],
    ['warning', /bg-warning-tint/],
    ['danger', /bg-danger-tint/],
    ['info', /bg-info-tint/],
  ] as const)('applies variant class for %s', (variant, pattern) => {
    render(<StatusBadge variant={variant}>label</StatusBadge>);
    expect(screen.getByText('label').className).toMatch(pattern);
  });

  it('renders an optional icon', () => {
    function Icon() {
      return <svg data-testid="status-icon" />;
    }
    render(
      <StatusBadge variant="success" icon={Icon}>
        actif
      </StatusBadge>,
    );
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });
});

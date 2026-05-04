// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '@/components/ui/alert';

describe('Alert', () => {
  it('renders title and children', () => {
    render(
      <Alert variant="info" title="Cabinet activé">
        L&apos;assistant IA est maintenant accessible.
      </Alert>,
    );
    expect(screen.getByText('Cabinet activé')).toBeInTheDocument();
    expect(
      screen.getByText("L'assistant IA est maintenant accessible."),
    ).toBeInTheDocument();
  });

  it.each([
    ['info', /bg-info-tint/],
    ['success', /bg-success-tint/],
    ['warning', /bg-warning-tint/],
    ['danger', /bg-danger-tint/],
  ] as const)('applies variant class for %s', (variant, pattern) => {
    const { container } = render(
      <Alert variant={variant}>{variant}</Alert>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(pattern);
  });

  it('renders an icon when variant is set', () => {
    const { container } = render(<Alert variant="danger">x</Alert>);
    expect(container.querySelector('[data-slot="alert-icon"]')).not.toBeNull();
  });
});

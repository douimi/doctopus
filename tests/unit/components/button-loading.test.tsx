// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button loading prop', () => {
  it('renders children when not loading', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Save');
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows spinner and disables button when loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('[data-slot="button-spinner"]')).not.toBeNull();
    expect(btn).toHaveTextContent('Save');
  });

  it('respects explicit disabled even without loading', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

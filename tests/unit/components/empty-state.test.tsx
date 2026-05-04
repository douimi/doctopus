// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        icon={Users}
        title="Aucun patient"
        description="Ajoutez votre premier patient."
        action={<button>Nouveau patient</button>}
      />,
    );
    expect(screen.getByText('Aucun patient')).toBeInTheDocument();
    expect(screen.getByText('Ajoutez votre premier patient.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nouveau patient' })).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    render(<EmptyState title="Aucun élément" />);
    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
  });
});

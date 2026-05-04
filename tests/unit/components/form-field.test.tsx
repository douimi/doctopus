// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/form-field';

describe('FormField', () => {
  it('renders label, description, error, and child input', () => {
    render(
      <FormField
        label="Email"
        description="On ne le partage avec personne."
        error="Email invalide"
      >
        <input data-testid="email-input" />
      </FormField>,
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('On ne le partage avec personne.')).toBeInTheDocument();
    expect(screen.getByText('Email invalide')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
  });

  it('connects label to child via htmlFor / id', () => {
    render(
      <FormField label="Email">
        <input data-testid="email-input" />
      </FormField>,
    );
    const input = screen.getByTestId('email-input') as HTMLInputElement;
    const label = screen.getByText('Email') as HTMLLabelElement;
    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
  });

  it('respects an existing id on the child', () => {
    render(
      <FormField label="Email">
        <input id="my-email" data-testid="email-input" />
      </FormField>,
    );
    const input = screen.getByTestId('email-input') as HTMLInputElement;
    const label = screen.getByText('Email') as HTMLLabelElement;
    expect(input.id).toBe('my-email');
    expect(label.htmlFor).toBe('my-email');
  });

  it('omits error block when no error', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    expect(screen.queryByText(/invalide/i)).toBeNull();
  });
});

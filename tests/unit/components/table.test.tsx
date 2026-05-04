// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

describe('Table', () => {
  it('renders header and rows', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cabinet</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Acme</TableCell>
            <TableCell>actif</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Cabinet')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('TableEmpty renders a row spanning columns', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>A</TableHead>
            <TableHead>B</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty colSpan={2}>Aucun élément</TableEmpty>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Aucun élément')).toBeInTheDocument();
    const cell = screen.getByText('Aucun élément').closest('td');
    expect(cell?.getAttribute('colspan')).toBe('2');
  });
});

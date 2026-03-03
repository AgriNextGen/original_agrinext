import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';

describe('NavLink', () => {
  it('renders with correct href', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavLink to="/about">About</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByText('About');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/about');
  });

  it('applies active class when route matches', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <NavLink to="/about" className="base" activeClassName="is-active">About</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByText('About');
    expect(link.className).toContain('is-active');
  });

  it('does not apply active class when route does not match', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavLink to="/about" className="base" activeClassName="is-active">About</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByText('About');
    expect(link.className).not.toContain('is-active');
  });
});

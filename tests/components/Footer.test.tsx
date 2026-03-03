import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '@/components/Footer';

describe('Footer', () => {
  const renderFooter = () => render(<BrowserRouter><Footer /></BrowserRouter>);

  it('renders the brand name', () => {
    renderFooter();
    expect(screen.getByText('AgriNext')).toBeDefined();
  });

  it('renders platform links', () => {
    renderFooter();
    expect(screen.getByText('For Farmers')).toBeDefined();
    expect(screen.getByText('For Buyers')).toBeDefined();
    expect(screen.getByText('For Agents')).toBeDefined();
    expect(screen.getByText('For Logistics')).toBeDefined();
  });

  it('renders company links', () => {
    renderFooter();
    expect(screen.getByText('About Us')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Contact' })).toBeDefined();
  });

  it('renders privacy and terms links with correct paths', () => {
    renderFooter();
    const privacyLink = screen.getByText('Privacy Policy');
    const termsLink = screen.getByText('Terms of Service');
    expect(privacyLink.closest('a')?.getAttribute('href')).toBe('/privacy');
    expect(termsLink.closest('a')?.getAttribute('href')).toBe('/terms');
  });

  it('renders contact email', () => {
    renderFooter();
    expect(screen.getByText('teamAgriNext.Gen@gmail.com')).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HeroSection from '@/components/HeroSection';

describe('HeroSection', () => {
  it('renders the main headline', () => {
    render(<BrowserRouter><HeroSection /></BrowserRouter>);
    const headings = screen.getAllByText(/India's Agricultural/i);
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByText(/Operating System/i)).toBeDefined();
  });

  it('renders role cards', () => {
    render(<BrowserRouter><HeroSection /></BrowserRouter>);
    expect(screen.getByText('Farmers')).toBeDefined();
    expect(screen.getByText('Buyers')).toBeDefined();
    expect(screen.getByText('Agents')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('renders the pilot CTA', () => {
    render(<BrowserRouter><HeroSection /></BrowserRouter>);
    expect(screen.getByText(/Join the Pilot Program/i)).toBeDefined();
  });
});

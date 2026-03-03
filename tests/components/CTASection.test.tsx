import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CTASection from '@/components/CTASection';

describe('CTASection', () => {
  it('renders CTA heading', () => {
    render(<BrowserRouter><CTASection /></BrowserRouter>);
    expect(screen.getByText(/Ready to Join the Pilot/i)).toBeDefined();
  });

  it('renders signup and contact buttons', () => {
    render(<BrowserRouter><CTASection /></BrowserRouter>);
    expect(screen.getByText(/Get Started/i)).toBeDefined();
    expect(screen.getByText(/Talk to Us/i)).toBeDefined();
  });
});

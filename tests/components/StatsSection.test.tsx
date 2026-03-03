import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsSection from '@/components/StatsSection';

describe('StatsSection', () => {
  it('renders honest pilot-stage stats', () => {
    render(<StatsSection />);
    // Should NOT contain fake inflated numbers
    expect(screen.queryByText('50K+')).toBeNull();
    expect(screen.queryByText('1M+')).toBeNull();
    expect(screen.queryByText('₹100Cr+')).toBeNull();
  });

  it('renders all stat items', () => {
    render(<StatsSection />);
    const statElements = screen.getAllByText(/Roles|Districts|Languages|Open Source/i);
    expect(statElements.length).toBeGreaterThanOrEqual(4);
  });
});

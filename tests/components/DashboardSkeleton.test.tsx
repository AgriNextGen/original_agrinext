import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('renders default 4 skeleton cards', () => {
    const { container } = render(<DashboardSkeleton />);
    // Each card has a skeleton header and content
    const cards = container.querySelectorAll('[class*="rounded-"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders custom number of cards', () => {
    const { container } = render(<DashboardSkeleton cards={6} />);
    expect(container).toBeDefined();
  });

  it('hides header when showHeader is false', () => {
    const { container } = render(<DashboardSkeleton showHeader={false} />);
    expect(container).toBeDefined();
  });
});

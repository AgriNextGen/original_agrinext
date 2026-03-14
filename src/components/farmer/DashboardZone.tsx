import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardZoneProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  hasContent?: boolean;
  className?: string;
}

const DashboardZone = ({
  title,
  children,
  defaultOpen = true,
  hasContent = true,
  className,
}: DashboardZoneProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!hasContent) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-1 text-left group"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardZone;

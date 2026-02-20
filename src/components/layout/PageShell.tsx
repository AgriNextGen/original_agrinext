import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageDensity = 'compact' | 'comfortable' | 'spacious';

export interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  density?: PageDensity;
  className?: string;
  children: ReactNode;
}

const densityClasses: Record<PageDensity, string> = {
  compact: 'space-y-4',
  comfortable: 'space-y-6',
  spacious: 'space-y-8',
};

const PageShell = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  density = 'comfortable',
  className,
  children,
}: PageShellProps) => {
  return (
    <section className={cn(densityClasses[density], className)}>
      {breadcrumbs ? <div>{breadcrumbs}</div> : null}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn(densityClasses[density])}>{children}</div>
    </section>
  );
};

export default PageShell;

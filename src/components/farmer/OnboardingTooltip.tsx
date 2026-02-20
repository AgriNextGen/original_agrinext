import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  showCondition?: boolean;
  onNext?: () => void;
  nextLabel?: string;
}

const OnboardingTooltip = ({
  id,
  title,
  description,
  position = 'bottom',
  children,
  showCondition = true,
  onNext,
  nextLabel = 'Got it',
}: OnboardingTooltipProps) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const dismissedTooltips = JSON.parse(localStorage.getItem('dismissed-tooltips') || '[]');
    setDismissed(dismissedTooltips.includes(id));
  }, [id]);

  const handleDismiss = () => {
    const dismissedTooltips = JSON.parse(localStorage.getItem('dismissed-tooltips') || '[]');
    localStorage.setItem('dismissed-tooltips', JSON.stringify([...dismissedTooltips, id]));
    setDismissed(true);
    if (onNext) onNext();
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-primary/90 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-primary/90 border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-primary/90 border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-primary/90 border-t-transparent border-b-transparent border-l-transparent',
  };

  if (dismissed || !showCondition) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      {children}
      <div className={cn(
        'absolute z-50 w-72 p-4 rounded-xl bg-primary/95 text-primary-foreground shadow-lg animate-in fade-in-50 slide-in-from-bottom-2',
        positionClasses[position]
      )}>
        {/* Arrow */}
        <div className={cn(
          'absolute w-0 h-0 border-[6px]',
          arrowClasses[position]
        )} />
        
        {/* Close button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
        
        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-primary-foreground/20 shrink-0">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            <p className="text-xs opacity-90 leading-relaxed mb-3">{description}</p>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleDismiss}
              className="h-7 text-xs"
            >
              {nextLabel}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTooltip;

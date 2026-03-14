import { LandPlot, Sprout, TrendingUp, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { useFarmlands, useFarmerProfile } from '@/hooks/useFarmerDashboard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Step {
  icon: typeof LandPlot;
  titleKey: string;
  descKey: string;
  route: string;
  isComplete: boolean;
}

const FarmerOnboardingWizard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: farmlands } = useFarmlands();
  const { profile } = useFarmerProfile();

  const { data: crops } = useQuery({
    queryKey: ['onboarding-crops', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('crops')
        .select('id')
        .limit(1);
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const hasFarmlands = (farmlands?.length ?? 0) > 0;
  const hasCrops = (crops?.length ?? 0) > 0;

  const steps: Step[] = [
    {
      icon: LandPlot,
      titleKey: 'dashboard.onboarding.step1Title',
      descKey: 'dashboard.onboarding.step1Desc',
      route: ROUTES.FARMER.FARMLANDS,
      isComplete: hasFarmlands,
    },
    {
      icon: Sprout,
      titleKey: 'dashboard.onboarding.step2Title',
      descKey: 'dashboard.onboarding.step2Desc',
      route: ROUTES.FARMER.CROPS,
      isComplete: hasCrops,
    },
    {
      icon: TrendingUp,
      titleKey: 'dashboard.onboarding.step3Title',
      descKey: 'dashboard.onboarding.step3Desc',
      route: ROUTES.FARMER.SETTINGS,
      isComplete: !!(profile?.full_name && profile?.district),
    },
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const allComplete = completedCount === steps.length;
  const nextStep = steps.find(s => !s.isComplete);

  if (allComplete) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold">
              {t('dashboard.onboarding.title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('dashboard.onboarding.subtitle')}
            </p>
          </div>
          <div className="text-sm font-medium text-primary">
            {completedCount}/{steps.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                step.isComplete ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isNext = step === nextStep;
            return (
              <button
                key={i}
                onClick={() => navigate(step.route)}
                className={cn(
                  'flex w-full items-center gap-4 p-3 rounded-xl text-left transition-all',
                  step.isComplete
                    ? 'bg-primary/5 border border-primary/20'
                    : isNext
                      ? 'bg-card border-2 border-primary shadow-sm hover:shadow-md'
                      : 'bg-card border border-border opacity-60'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    step.isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isNext
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    step.isComplete && 'line-through text-muted-foreground'
                  )}>
                    {t(step.titleKey)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {t(step.descKey)}
                  </p>
                </div>
                {isNext && (
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmerOnboardingWizard;

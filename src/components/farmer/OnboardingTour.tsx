import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Sprout, 
  LandPlot, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  PartyPopper,
  Truck,
  BarChart3
} from 'lucide-react';
import { useFarmlands, useCrops } from '@/hooks/useFarmerDashboard';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  checkComplete: () => boolean;
  action: string;
}

const OnboardingTour = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: farmlands, isLoading: farmlandsLoading } = useFarmlands();
  const { data: crops, isLoading: cropsLoading } = useCrops();
  
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const isDismissed = localStorage.getItem('onboarding-dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'farmland',
      title: 'Add Your Farmland',
      description: 'Start by registering your farmland plots. This helps track which crops are grown where.',
      icon: LandPlot,
      route: '/farmer/farmlands',
      checkComplete: () => (farmlands?.length || 0) > 0,
      action: 'Add Farmland',
    },
    {
      id: 'crop',
      title: 'Add Your First Crop',
      description: 'Register the crops you are growing. Track their growth status and expected harvest dates.',
      icon: Sprout,
      route: '/farmer/crops',
      checkComplete: () => (crops?.length || 0) > 0,
      action: 'Add Crop',
    },
  ];

  const completedSteps = steps.filter(step => step.checkComplete()).length;
  const progress = (completedSteps / steps.length) * 100;
  const allComplete = completedSteps === steps.length;
  const currentStepIndex = steps.findIndex(step => !step.checkComplete());
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  // Show celebration when all steps complete
  useEffect(() => {
    if (allComplete && !dismissed) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem('onboarding-dismissed', 'true');
    setDismissed(true);
  };

  const handleStepAction = (step: OnboardingStep) => {
    navigate(step.route);
  };

  // Don't show if loading or dismissed
  if (farmlandsLoading || cropsLoading || dismissed) {
    return null;
  }

  // Don't show if all complete and celebration is done
  if (allComplete && !showCelebration) {
    return null;
  }

  // Celebration card
  if (allComplete && showCelebration) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-emerald-50 dark:from-primary/10 dark:to-emerald-950 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <PartyPopper className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Welcome to Agri Mitra! 🎉</CardTitle>
                <CardDescription>You're all set up and ready to go</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground mb-4">
            Great job! You've added your farmland and crops. Now you can track harvests, request transport, and monitor market prices.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/farmer/transport')}>
              <Truck className="h-4 w-4 mr-1" />
              Request Transport
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/farmer/dashboard')}>
              <BarChart3 className="h-4 w-4 mr-1" />
              View Dashboard
            </Button>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
            Don't show this again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-amber-50/50 dark:from-primary/10 dark:to-amber-950/30 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              👋 Welcome! Let's Get Started
            </CardTitle>
            <CardDescription>Complete these steps to set up your farm</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground text-xs">
            Skip for now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Setup Progress</span>
            <span className="font-medium text-primary">{completedSteps} of {steps.length} complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isComplete = step.checkComplete();
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;
            
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl transition-all',
                  isComplete && 'bg-emerald-50 dark:bg-emerald-950/30',
                  isCurrent && 'bg-primary/5 border border-primary/20',
                  !isComplete && !isCurrent && 'opacity-60'
                )}
              >
                {/* Step number/check */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  isComplete && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
                  isCurrent && 'bg-primary/10 text-primary',
                  !isComplete && !isCurrent && 'bg-muted text-muted-foreground'
                )}>
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'font-medium text-sm',
                    isComplete && 'text-emerald-700 dark:text-emerald-400',
                    isCurrent && 'text-foreground'
                  )}>
                    {isComplete ? `✓ ${step.title}` : step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {step.description}
                  </p>
                </div>

                {/* Action button */}
                {isCurrent && (
                  <Button 
                    size="sm" 
                    onClick={() => handleStepAction(step)}
                    className="shrink-0"
                  >
                    {step.action}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingTour;

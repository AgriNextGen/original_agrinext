import { UserPlus, Settings, Rocket, TrendingUp } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const WorkflowSection = () => {
  const { t } = useLanguage();

  const steps = [
    {
      number: 1,
      icon: UserPlus,
      title: t('landing.workflow.step1Title'),
      description: t('landing.workflow.step1Desc'),
      color: "bg-emerald-500",
      ring: "ring-emerald-500/20",
    },
    {
      number: 2,
      icon: Settings,
      title: t('landing.workflow.step2Title'),
      description: t('landing.workflow.step2Desc'),
      color: "bg-blue-500",
      ring: "ring-blue-500/20",
    },
    {
      number: 3,
      icon: Rocket,
      title: t('landing.workflow.step3Title'),
      description: t('landing.workflow.step3Desc'),
      color: "bg-amber-500",
      ring: "ring-amber-500/20",
    },
    {
      number: 4,
      icon: TrendingUp,
      title: t('landing.workflow.step4Title'),
      description: t('landing.workflow.step4Desc'),
      color: "bg-purple-500",
      ring: "ring-purple-500/20",
    },
  ];

  return (
    <section id="workflow" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.02] blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/[0.15] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('landing.workflow.label')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-display font-bold leading-tight mb-5 text-foreground tracking-tight">
            {t('landing.workflow.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('landing.workflow.description')}
          </p>
        </div>

        <div className="hidden md:block relative">
          <div className="absolute top-[52px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-[2px]" aria-hidden="true">
            <div className="h-full bg-gradient-to-r from-emerald-300 via-blue-300 via-amber-300 to-purple-300 rounded-full opacity-40" />
          </div>

          <div className="grid grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center group">
                <div className="relative z-10 mx-auto mb-6">
                  <div className={cn(
                    "w-[104px] h-[104px] rounded-3xl flex items-center justify-center mx-auto",
                    "shadow-soft group-hover:shadow-medium transition-all duration-300 group-hover:-translate-y-1",
                    "ring-4", step.ring, step.color
                  )}>
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm">
                    <span className="text-xs font-black text-foreground">{step.number}</span>
                  </div>
                </div>

                <h3 className="text-base font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative">
              {idx < steps.length - 1 && (
                <div className="absolute left-[30px] top-[72px] bottom-0 w-[2px] bg-border/60" aria-hidden="true" />
              )}
              <div className="relative flex items-start gap-5 p-5 rounded-2xl bg-card border border-border/50 shadow-soft">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-[60px] h-[60px] rounded-2xl flex items-center justify-center shadow-sm ring-2",
                    step.ring, step.color
                  )}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                    <span className="text-[10px] font-black text-foreground">{step.number}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-base font-display font-bold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;

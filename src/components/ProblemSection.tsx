import { TrendingDown, Warehouse, Truck, Brain, Database } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const ProblemSection = () => {
  const { t } = useLanguage();

  const problems = [
    {
      icon: TrendingDown,
      title: t('landing.problem.priceCrashes'),
      description: t('landing.problem.priceCrashesDesc'),
      stat: "60%",
      statLabel: "income volatility",
    },
    {
      icon: Warehouse,
      title: t('landing.problem.postHarvestLoss'),
      description: t('landing.problem.postHarvestLossDesc'),
      stat: "40%",
      statLabel: "produce wasted",
    },
    {
      icon: Truck,
      title: t('landing.problem.fragmentedTransport'),
      description: t('landing.problem.fragmentedTransportDesc'),
      stat: "3x",
      statLabel: "cost overheads",
    },
    {
      icon: Brain,
      title: t('landing.problem.weakDecisionSupport'),
      description: t('landing.problem.weakDecisionSupportDesc'),
      stat: "0",
      statLabel: "data-driven signals",
    },
    {
      icon: Database,
      title: t('landing.problem.noIntegratedData'),
      description: t('landing.problem.noIntegratedDataDesc'),
      stat: "90%",
      statLabel: "data undigitized",
    },
  ];

  return (
    <section id="problem" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-destructive/[0.03] blur-[100px] translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px] -translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/[0.08] border border-destructive/[0.15] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            <span className="text-xs font-bold text-destructive uppercase tracking-wider">{t('landing.problem.label')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-display font-bold leading-tight mb-5 text-foreground tracking-tight">
            {t('landing.problem.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('landing.problem.summary')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {problems.map((problem, index) => (
            <div
              key={problem.title}
              className={`group relative p-6 rounded-2xl bg-card border border-border/50 shadow-soft
                hover:shadow-medium hover:-translate-y-1.5 hover:border-destructive/20
                transition-all duration-300 ${index >= 3 ? 'lg:col-span-1' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-destructive/[0.08] flex items-center justify-center group-hover:bg-destructive/[0.12] group-hover:scale-110 transition-all duration-300">
                  <problem.icon className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-display font-bold text-foreground mb-1.5 group-hover:text-destructive/90 transition-colors">
                    {problem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/40 flex items-baseline gap-2">
                <span className="text-2xl font-display font-extrabold text-destructive/80">{problem.stat}</span>
                <span className="text-xs text-muted-foreground font-medium">{problem.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;

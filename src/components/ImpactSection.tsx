import { Sprout, Store, Truck, Building2, Landmark } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const ImpactSection = () => {
  const { t } = useLanguage();

  const stakeholders = [
    {
      icon: Sprout,
      label: t('landing.impact.farmersLabel'),
      impact: t('landing.impact.farmersImpact'),
      description: t('landing.impact.farmersDesc'),
      color: "emerald",
    },
    {
      icon: Store,
      label: t('landing.impact.marketsLabel'),
      impact: t('landing.impact.marketsImpact'),
      description: t('landing.impact.marketsDesc'),
      color: "blue",
    },
    {
      icon: Truck,
      label: t('landing.impact.logisticsLabel'),
      impact: t('landing.impact.logisticsImpact'),
      description: t('landing.impact.logisticsDesc'),
      color: "amber",
    },
    {
      icon: Building2,
      label: t('landing.impact.agribizLabel'),
      impact: t('landing.impact.agribizImpact'),
      description: t('landing.impact.agribizDesc'),
      color: "purple",
    },
    {
      icon: Landmark,
      label: t('landing.impact.policyLabel'),
      impact: t('landing.impact.policyImpact'),
      description: t('landing.impact.policyDesc'),
      color: "cyan",
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string; text: string }> = {
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "group-hover:border-emerald-200", text: "text-emerald-600" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "group-hover:border-blue-200", text: "text-blue-600" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "group-hover:border-amber-200", text: "text-amber-600" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "group-hover:border-purple-200", text: "text-purple-600" },
    cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", border: "group-hover:border-cyan-200", text: "text-cyan-600" },
  };

  return (
    <section id="impact" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[100px] -translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/[0.15] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('landing.impact.label')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-display font-bold leading-tight mb-5 text-foreground tracking-tight">
            {t('landing.impact.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('landing.impact.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stakeholders.map((s) => {
            const c = colorMap[s.color];
            return (
              <div
                key={s.label}
                className={cn(
                  "group relative p-5 rounded-2xl bg-card border border-border/50 shadow-soft",
                  "hover:shadow-medium hover:-translate-y-1.5 transition-all duration-300 text-center",
                  c.border
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto",
                  "group-hover:scale-110 transition-transform duration-300",
                  c.bg
                )}>
                  <s.icon className={cn("w-6 h-6", c.icon)} />
                </div>
                <h3 className="text-base font-display font-bold text-foreground mb-1">
                  {s.label}
                </h3>
                <p className={cn("text-sm font-bold mb-2", c.text)}>
                  {s.impact}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;

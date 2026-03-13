import { Sprout, Store, Truck, Building2, Landmark } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const stakeholders = [
  {
    icon: Sprout,
    label: "Farmers",
    impact: "Better Income Stability",
    description: "Predictive advisory and coordinated logistics reduce market risk and improve price realization.",
  },
  {
    icon: Store,
    label: "Markets",
    impact: "Predictable Supply Flows",
    description: "Supply forecasting prevents glut-driven crashes and enables smoother procurement planning.",
  },
  {
    icon: Truck,
    label: "Logistics",
    impact: "Higher Vehicle Utilization",
    description: "Load aggregation and route optimization increase fill rates and reduce empty runs.",
  },
  {
    icon: Building2,
    label: "Agribusiness",
    impact: "Better Demand Forecasting",
    description: "Real-time supply visibility enables more accurate sourcing and inventory decisions.",
  },
  {
    icon: Landmark,
    label: "Policymakers",
    impact: "Real-time Agricultural Insights",
    description: "Structured ground data provides visibility into crop health, supply patterns, and market stability.",
  },
];

const ImpactSection = () => {
  const { t } = useLanguage();
  return (
    <section id="impact" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-accent/3 blur-3xl -translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.impact.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.impact.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.impact.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {stakeholders.map((s) => (
            <div
              key={s.label}
              className="group p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center mb-4 mx-auto group-hover:scale-105 transition-transform">
                <s.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-base font-display font-semibold text-foreground mb-1">
                {s.label}
              </h3>
              <p className="text-sm font-semibold text-primary mb-2">
                {s.impact}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;

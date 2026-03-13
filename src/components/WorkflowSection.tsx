import { UserPlus, Radio, Brain, Truck, MessageSquare, BarChart3 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Farmer Registers Crop",
    description: "Farmer or field agent digitizes crop records, farmland data, and planting details.",
  },
  {
    number: 2,
    icon: Radio,
    title: "System Captures Ground Signals",
    description: "Soil, weather, crop health, and market data are ingested into the core data platform.",
  },
  {
    number: 3,
    icon: Brain,
    title: "AI Predicts Supply and Demand",
    description: "Forecasting engine models supply volumes and identifies demand-supply mismatches.",
  },
  {
    number: 4,
    icon: Truck,
    title: "Logistics and Storage Planned",
    description: "Transport routes are optimized and cold storage capacity is pre-allocated.",
  },
  {
    number: 5,
    icon: MessageSquare,
    title: "Farmers Receive Advisory",
    description: "Personalized recommendations on timing, pricing, and logistics reach the farmer.",
  },
  {
    number: 6,
    icon: BarChart3,
    title: "Markets Stabilize Through Coordinated Supply",
    description: "Predictive coordination reduces price crashes and post-harvest losses at scale.",
  },
];

const WorkflowSection = () => {
  const { t } = useLanguage();
  return (
    <section id="workflow" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.workflow.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.workflow.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.workflow.description')}
          </p>
        </div>

        {/* Desktop: vertical timeline */}
        <div className="hidden md:block relative max-w-3xl mx-auto">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-primary/5" aria-hidden="true" />

          <div className="space-y-10">
            {steps.map((step) => (
              <div key={step.number} className="relative flex items-start gap-6 group">
                <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow">
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">
                      Step {String(step.number).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center">
                <step.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                  Step {String(step.number).padStart(2, "0")}
                </span>
                <h3 className="text-base font-display font-semibold text-foreground mt-0.5 mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;

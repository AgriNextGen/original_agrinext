import { Sprout, Brain, Truck, Thermometer, MessageSquare } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const modules = [
  {
    icon: Sprout,
    title: "Farm Data Intelligence",
    description: "Captures and structures farm-level signals — crop records, soil health, planting cycles — into a queryable data platform.",
  },
  {
    icon: Brain,
    title: "AI Prediction Engine",
    description: "Forecasts supply volumes, demand shifts, and price risk using biological and market signals.",
  },
  {
    icon: Truck,
    title: "Logistics Optimization",
    description: "Aggregates small-farm loads and plans transport routes to reduce cost and empty-run waste.",
  },
  {
    icon: Thermometer,
    title: "Cold Storage Planning",
    description: "Predicts storage demand and allocates cold chain capacity before post-harvest losses occur.",
  },
  {
    icon: MessageSquare,
    title: "Advisory System",
    description: "Delivers personalized, context-aware recommendations to farmers based on real-time data.",
  },
];

const PlatformSection = () => {
  const { t } = useLanguage();
  return (
    <section id="platform" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-primary/3 blur-3xl -translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.platform.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.platform.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.platform.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className="group p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <mod.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {mod.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mod.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformSection;

import { BarChart3, Route, TrendingDown, MessageSquare } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const engines = [
  {
    icon: BarChart3,
    title: "Supply Forecasting Engine",
    description:
      "Predicts crop supply volumes before harvest using biological growth models, weather data, and historical yield patterns. Enables proactive market coordination rather than reactive response.",
  },
  {
    icon: Route,
    title: "Logistics Optimization Engine",
    description:
      "Aggregates small-farm loads into efficient transport batches and optimizes route planning. Reduces per-unit logistics cost and eliminates empty-run waste across the network.",
  },
  {
    icon: TrendingDown,
    title: "Market Risk Engine",
    description:
      "Detects potential price crashes before they occur by correlating supply forecasts with demand signals. Triggers advisory and logistics adjustments to prevent market destabilization.",
  },
  {
    icon: MessageSquare,
    title: "Advisory Engine",
    description:
      "Delivers personalized, context-aware recommendations to individual farmers — timing for harvest, optimal selling windows, and logistics coordination based on real-time system state.",
  },
];

const IntelligenceSection = () => {
  const { t } = useLanguage();
  return (
    <section id="intelligence" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/3 blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.intelligence.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.intelligence.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.intelligence.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {engines.map((engine) => (
            <div
              key={engine.title}
              className="group p-6 md:p-8 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-premium flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <engine.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                {engine.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {engine.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntelligenceSection;

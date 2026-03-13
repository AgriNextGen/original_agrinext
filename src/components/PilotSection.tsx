import { MapPin, Users } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const clusters = [
  {
    name: "Tomato Cluster",
    description: "High-volume perishable crop with severe price volatility. Ideal testbed for supply forecasting and cold storage coordination.",
    color: "bg-destructive/10 border-destructive/20",
    textColor: "text-destructive",
  },
  {
    name: "Onion Cluster",
    description: "Seasonal storage crop with predictable demand but unpredictable supply gluts. Tests logistics aggregation and market risk detection.",
    color: "bg-accent/10 border-accent/20",
    textColor: "text-accent-foreground",
  },
  {
    name: "Mixed Horticulture Cluster",
    description: "Multi-crop region with diverse logistics needs. Validates the platform's ability to coordinate heterogeneous supply chains.",
    color: "bg-primary/10 border-primary/20",
    textColor: "text-primary",
  },
];

const PilotSection = () => {
  const { t } = useLanguage();
  return (
    <section id="pilot" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.pilot.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.pilot.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.pilot.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {clusters.map((cluster) => (
            <div
              key={cluster.name}
              className={`p-6 rounded-2xl border ${cluster.color} transition-all hover:shadow-soft`}
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin className={`w-5 h-5 ${cluster.textColor}`} />
                <h3 className="text-lg font-display font-semibold text-foreground">
                  {cluster.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cluster.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border/60 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                  The Agent Network Model
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Each pilot region operates through a network of trained field agents who serve as the
                  ground-truth layer of the platform. Agents verify crop data, onboard farmers, and ensure
                  the integrity of the data pipeline. This human-in-the-loop model is what enables
                  AgriNext Gen to build verified, high-fidelity agricultural datasets at scale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PilotSection;

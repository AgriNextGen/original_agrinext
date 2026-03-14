import { Fingerprint, Dna, Network } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const moats = [
  {
    icon: Fingerprint,
    title: "Hardware Handshake Data Verification",
    description:
      "Ground-truth data is captured through agent verification and device-level attestation, creating a verified data layer that cannot be replicated from satellite or secondary sources alone.",
  },
  {
    icon: Dna,
    title: "Biological-Market Synchronization Engine",
    description:
      "Proprietary models synchronize biological crop growth cycles with real-time market demand signals — a temporal coordination layer that requires both domain expertise and continuous ground data.",
  },
  {
    icon: Network,
    title: "Asymmetric Logistics Aggregator",
    description:
      "Aggregates fragmented small-farm logistics into efficient batch routes. Network effects compound: each additional farmer improves load density, route efficiency, and cost reduction for the entire network.",
  },
];

const DefensibilitySection = () => {
  const { t } = useLanguage();
  return (
    <section id="defensibility" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.defensibility.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.defensibility.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.defensibility.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {moats.map((moat) => (
            <div
              key={moat.title}
              className="group p-6 md:p-8 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <moat.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-3">
                {moat.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {moat.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto text-center">
          <div className="p-6 rounded-2xl bg-muted/50 border border-border/60">
            <p className="text-muted-foreground leading-relaxed">
              As the agent network grows and more farm-level data is verified, the platform's predictive
              accuracy improves — making the data moat deeper with every season. This is not a feature
              advantage. It is a structural one.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DefensibilitySection;

import { TrendingDown, Warehouse, Truck, Brain, Database } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const problems = [
  {
    icon: TrendingDown,
    title: "Price Crashes in Perishable Crops",
    description: "Uncoordinated supply floods markets, destroying farmer income overnight.",
  },
  {
    icon: Warehouse,
    title: "High Post-Harvest Losses",
    description: "Up to 40% of perishable produce is lost between farm gate and consumer.",
  },
  {
    icon: Truck,
    title: "Fragmented Transportation",
    description: "Small farms cannot access efficient logistics individually.",
  },
  {
    icon: Brain,
    title: "Weak Decision Support",
    description: "Farmers lack timely, data-driven signals to guide planting and selling decisions.",
  },
  {
    icon: Database,
    title: "No Integrated Agricultural Data",
    description: "Farm-level data remains siloed, preventing systemic coordination.",
  },
];

const ProblemSection = () => {
  const { t } = useLanguage();
  return (
    <section id="problem" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-destructive/3 blur-3xl translate-x-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.problem.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.problem.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.problem.summary')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-12">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="group p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:bg-destructive/15 transition-colors">
                <problem.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {problem.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed border-t border-border/60 pt-8">
            {t('landing.problem.summary')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;

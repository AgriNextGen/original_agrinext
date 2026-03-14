import { useLanguage } from "@/hooks/useLanguage";

const layers = [
  {
    label: "Data Ingestion Layer",
    color: "bg-primary/10 border-primary/20",
    items: ["Farmer data", "Agent verification", "Soil and weather feeds"],
  },
  {
    label: "Core Data Platform",
    color: "bg-accent/10 border-accent/20",
    items: ["Farmer profiles", "Production projections", "Market signals"],
  },
  {
    label: "AI Intelligence Layer",
    color: "bg-info/10 border-info/20",
    items: ["Supply forecasting", "Price risk prediction", "Logistics optimization"],
  },
  {
    label: "Coordination Engine",
    color: "bg-success/10 border-success/20",
    items: ["Transport planning", "Storage allocation", "Advisory triggers"],
  },
  {
    label: "Application Interfaces",
    color: "bg-warning/10 border-warning/20",
    items: ["Farmer app", "Agent dashboard", "Admin analytics"],
  },
];

const ArchitectureSection = () => {
  const { t } = useLanguage();
  return (
    <section id="architecture" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.architecture.label')}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-3 mb-5 text-foreground">
            {t('landing.architecture.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {t('landing.architecture.description')}
          </p>
        </div>

        <div className="space-y-0">
          {layers.map((layer, index) => (
            <div key={layer.label} className="relative">
              {index > 0 && (
                <div className="flex justify-center py-2">
                  <div className="w-px h-6 bg-border" />
                  <svg className="absolute" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true" style={{ marginTop: '18px', marginLeft: '-5.5px' }}>
                    <path d="M6 8L0 0h12z" fill="hsl(var(--border))" />
                  </svg>
                </div>
              )}
              <div className={`rounded-2xl border p-5 md:p-6 ${layer.color} transition-all hover:shadow-soft`}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="md:w-56 flex-shrink-0">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-foreground/10 text-xs font-bold text-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-display font-semibold text-foreground">
                        {layer.label}
                      </h3>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 md:gap-3">
                    {layer.items.map((item) => (
                      <span
                        key={item}
                        className="inline-flex px-3 py-1.5 rounded-lg bg-card border border-border/60 text-sm text-muted-foreground font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArchitectureSection;

import { useLanguage } from "@/hooks/useLanguage";

const VisionSection = () => {
  const { t } = useLanguage();
  return (
    <section id="vision" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3" />

      <div className="container mx-auto px-4 relative z-10 max-w-4xl">
        <div className="text-center">
          <h2 className="text-primary font-semibold text-sm uppercase tracking-wider">{t('landing.vision.label')}</h2>

          <div className="mt-8 mb-8">
            <div className="w-12 h-px bg-primary/40 mx-auto mb-8" />
            <blockquote className="text-xl sm:text-2xl md:text-3xl font-display font-bold leading-snug text-foreground">
              {t('landing.vision.statement')}
            </blockquote>
            <div className="w-12 h-px bg-primary/40 mx-auto mt-8" />
          </div>

          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            From Karnataka to the subcontinent — the goal is not a product but a layer: a persistent,
            intelligent coordination infrastructure that agriculture systems can build upon.
          </p>
        </div>
      </div>
    </section>
  );
};

export default VisionSection;

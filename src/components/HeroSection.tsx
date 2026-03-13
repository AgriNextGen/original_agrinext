import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const HeroSection = () => {
  const { t } = useLanguage();
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50" />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/8 border border-primary/15 mb-10 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            <span className="text-sm font-medium text-primary tracking-wide">{t('landing.badge')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] mb-6 animate-slide-up text-foreground">
            AgriNext{" "}
            <span className="text-gradient-hero">Gen</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl font-display font-medium text-foreground/80 mb-6 animate-slide-up" style={{ animationDelay: "0.08s" }}>
            {t('landing.hero.subtitle')}
          </p>

          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: "0.14s" }}>
            {t('landing.hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button
              size="lg"
              className="min-h-[52px] px-8 text-base font-semibold rounded-2xl bg-gradient-premium hover:brightness-90 transition-all gap-2"
              onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t('landing.hero.explorePlatform')}
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-[52px] px-8 text-base font-medium rounded-2xl border-2"
              onClick={() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t('landing.hero.joinPilot')}
            </Button>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <button
              onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <span className="text-xs font-medium uppercase tracking-widest">{t('landing.hero.discover')}</span>
              <ArrowDown className="w-5 h-5 animate-bounce" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

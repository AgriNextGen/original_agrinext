import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake, Monitor } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const CTASection = () => {
  const { t } = useLanguage();
  return (
    <section id="cta" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-card border border-border/50 shadow-medium -z-10" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />

          <div className="p-8 md:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
              {t('landing.cta.title')}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              {t('landing.cta.description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="min-h-[52px] px-8 text-base font-semibold rounded-2xl bg-gradient-premium hover:brightness-90 transition-all gap-2"
                onClick={() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t('landing.cta.joinPilot')}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[52px] px-8 text-base font-medium rounded-2xl border-2 gap-2"
                asChild
              >
                <a href="mailto:contact@agrivectra.com">
                  <Handshake className="w-5 h-5" />
                  {t('landing.cta.partner')}
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[52px] px-8 text-base font-medium rounded-2xl border-2 gap-2"
                asChild
              >
                <a href="mailto:demo@agrivectra.com">
                  <Monitor className="w-5 h-5" />
                  {t('landing.cta.requestDemo')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

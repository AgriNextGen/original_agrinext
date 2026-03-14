import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Monitor, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { ROUTES } from "@/lib/routes";

const CTASection = () => {
  const { t } = useLanguage();
  return (
    <section id="cta" className="py-24 md:py-32 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-accent/[0.15] blur-[60px]" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary/[0.15] blur-[60px]" />

          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-background to-accent/[0.04]" />
            <div className="absolute inset-0 border border-border/50 rounded-3xl" />

            <div className="relative p-10 md:p-16 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/[0.15] mb-6">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Free to Start</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold mb-5 text-foreground tracking-tight leading-tight">
                {t('landing.cta.title')}
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
                {t('landing.cta.description')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="min-h-[56px] px-10 text-base font-bold rounded-2xl bg-gradient-premium hover:brightness-110 hover:shadow-glow transition-all gap-2.5 shadow-md"
                  asChild
                >
                  <Link to={ROUTES.SIGNUP}>
                    {t('landing.cta.createAccount')}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-[56px] px-10 text-base font-semibold rounded-2xl border-2 gap-2.5 hover:bg-muted/50 transition-all"
                  asChild
                >
                  <a href="mailto:demo@agrivectra.com">
                    <Monitor className="w-5 h-5" />
                    {t('landing.cta.requestDemo')}
                  </a>
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-border/40">
                <p className="text-xs text-muted-foreground font-medium mb-3">Or sign up for your specific role:</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { key: 'landing.cta.joinAsFarmer', emoji: '🌾', color: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
                    { key: 'landing.cta.joinAsBuyer', emoji: '🛒', color: 'text-blue-700 border-blue-200 hover:bg-blue-50' },
                    { key: 'landing.cta.joinAsTransporter', emoji: '🚛', color: 'text-purple-700 border-purple-200 hover:bg-purple-50' },
                    { key: 'landing.cta.joinAsAgent', emoji: '📋', color: 'text-amber-700 border-amber-200 hover:bg-amber-50' },
                  ].map((role) => (
                    <Link
                      key={role.key}
                      to={ROUTES.SIGNUP}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border bg-background transition-colors ${role.color}`}
                    >
                      <span>{role.emoji}</span>
                      <span>{t(role.key as any)}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70 mt-4">
                No credit card required. Works on any phone or computer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

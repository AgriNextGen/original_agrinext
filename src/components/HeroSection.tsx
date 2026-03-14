import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown, LogIn, Sprout, TrendingUp, Truck, BarChart3 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { ROUTES } from "@/lib/routes";

const HeroSection = () => {
  const { t } = useLanguage();
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-background to-background" />

      <div className="absolute top-20 left-[10%] w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px]" />
      <div className="absolute bottom-20 right-[10%] w-[400px] h-[400px] rounded-full bg-accent/[0.06] blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.02] blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/[0.08] border border-primary/[0.15] mb-8 animate-fade-in">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-sm font-semibold text-primary tracking-wide">{t('landing.badge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[3.5rem] font-display font-extrabold leading-[1.08] mb-6 animate-slide-up tracking-tight">
              <span className="text-foreground">{t('landing.hero.line1')}</span>
              <br />
              <span className="text-gradient-hero">{t('landing.hero.line2')}</span>
              <br />
              <span className="text-foreground">{t('landing.hero.line3')}</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {t('landing.hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10 animate-slide-up" style={{ animationDelay: "0.18s" }}>
              <Button
                size="lg"
                className="min-h-[52px] px-8 text-base font-bold rounded-2xl bg-gradient-premium hover:brightness-110 hover:shadow-glow transition-all gap-2 shadow-md"
                asChild
              >
                <Link to={ROUTES.SIGNUP}>
                  {t('landing.hero.getStarted')}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[52px] px-8 text-base font-medium rounded-2xl border-2 border-border/80 gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                asChild
              >
                <Link to={ROUTES.LOGIN}>
                  <LogIn className="w-5 h-5" />
                  {t('landing.hero.signIn')}
                </Link>
              </Button>
            </div>

            <div className="animate-slide-up flex flex-wrap items-center gap-2 justify-center lg:justify-start mb-6" style={{ animationDelay: "0.22s" }}>
              <span className="text-xs text-muted-foreground font-medium shrink-0">I am a:</span>
              {[
                { label: 'Farmer', emoji: '🌾', color: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' },
                { label: 'Buyer', emoji: '🛒', color: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' },
                { label: 'Transporter', emoji: '🚛', color: 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100' },
                { label: 'Field Agent', emoji: '📋', color: 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100' },
              ].map((role) => (
                <Link
                  key={role.label}
                  to={ROUTES.SIGNUP}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${role.color}`}
                >
                  <span>{role.emoji}</span>
                  <span>{role.label}</span>
                </Link>
              ))}
            </div>

            <div className="animate-slide-up flex items-center gap-6 justify-center lg:justify-start" style={{ animationDelay: "0.28s" }}>
              <div className="flex -space-x-2">
                {[
                  { bg: "bg-emerald-500", title: "Farmer" },
                  { bg: "bg-blue-500", title: "Buyer" },
                  { bg: "bg-amber-500", title: "Agent" },
                  { bg: "bg-purple-500", title: "Transporter" },
                ].map((item, i) => (
                  <div key={i} title={item.title} className={`w-8 h-8 rounded-full ${item.bg} border-2 border-background flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-white">{["F", "B", "A", "T"][i]}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">500+</span> users across Karnataka
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-3xl blur-2xl" />

              <div className="relative bg-card rounded-2xl border border-border/60 shadow-premium overflow-hidden">
                <div className="bg-gradient-premium px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/20" />
                    <div className="w-3 h-3 rounded-full bg-white/20" />
                    <div className="w-3 h-3 rounded-full bg-white/20" />
                  </div>
                  <span className="text-sm font-medium text-primary-foreground/80">AgriNext Gen Dashboard</span>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Sprout, label: "Active Crops", value: "24", trend: "+3", color: "text-emerald-600 bg-emerald-50" },
                      { icon: TrendingUp, label: "Revenue", value: "₹2.4L", trend: "+18%", color: "text-blue-600 bg-blue-50" },
                      { icon: Truck, label: "Deliveries", value: "12", trend: "On track", color: "text-amber-600 bg-amber-50" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-xl bg-muted/40 border border-border/40">
                        <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-muted-foreground mb-0.5">{stat.label}</div>
                        <div className="text-lg font-bold text-foreground">{stat.value}</div>
                        <div className="text-xs font-medium text-primary">{stat.trend}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">Market Prices</span>
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { crop: "Tomatoes", price: "₹28/kg", change: "+12%", bar: "w-4/5" },
                        { crop: "Onions", price: "₹18/kg", change: "-3%", bar: "w-3/5" },
                        { crop: "Rice", price: "₹42/kg", change: "+5%", bar: "w-[90%]" },
                      ].map((item) => (
                        <div key={item.crop} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16">{item.crop}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${item.bar} bg-gradient-premium rounded-full`} />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-14 text-right">{item.price}</span>
                          <span className={`text-xs font-medium w-10 text-right ${item.change.startsWith('+') ? 'text-primary' : 'text-destructive'}`}>
                            {item.change}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center animate-slide-up lg:hidden" style={{ animationDelay: "0.35s" }}>
          <button
            onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-widest">{t('landing.hero.discover')}</span>
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

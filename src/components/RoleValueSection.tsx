import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, ShoppingBag, ClipboardList, Truck, ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const RoleValueSection = () => {
  const { t } = useLanguage();

  const roles = [
    {
      icon: Users,
      title: t('landing.roles.farmerTitle'),
      bullets: [
        t('landing.roles.farmerBullet1'),
        t('landing.roles.farmerBullet2'),
        t('landing.roles.farmerBullet3'),
      ],
      cta: t('landing.roles.farmerCta'),
      gradient: "from-emerald-500 to-emerald-600",
      light: "bg-emerald-50 border-emerald-100",
      iconBg: "bg-emerald-500",
      checkColor: "text-emerald-500",
      ctaColor: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      accent: "bg-emerald-500/10",
    },
    {
      icon: ShoppingBag,
      title: t('landing.roles.buyerTitle'),
      bullets: [
        t('landing.roles.buyerBullet1'),
        t('landing.roles.buyerBullet2'),
        t('landing.roles.buyerBullet3'),
      ],
      cta: t('landing.roles.buyerCta'),
      gradient: "from-blue-500 to-blue-600",
      light: "bg-blue-50 border-blue-100",
      iconBg: "bg-blue-500",
      checkColor: "text-blue-500",
      ctaColor: "border-blue-200 text-blue-700 hover:bg-blue-50",
      accent: "bg-blue-500/10",
    },
    {
      icon: ClipboardList,
      title: t('landing.roles.agentTitle'),
      bullets: [
        t('landing.roles.agentBullet1'),
        t('landing.roles.agentBullet2'),
        t('landing.roles.agentBullet3'),
      ],
      cta: t('landing.roles.agentCta'),
      gradient: "from-amber-500 to-amber-600",
      light: "bg-amber-50 border-amber-100",
      iconBg: "bg-amber-500",
      checkColor: "text-amber-500",
      ctaColor: "border-amber-200 text-amber-700 hover:bg-amber-50",
      accent: "bg-amber-500/10",
    },
    {
      icon: Truck,
      title: t('landing.roles.logisticsTitle'),
      bullets: [
        t('landing.roles.logisticsBullet1'),
        t('landing.roles.logisticsBullet2'),
        t('landing.roles.logisticsBullet3'),
      ],
      cta: t('landing.roles.logisticsCta'),
      gradient: "from-purple-500 to-purple-600",
      light: "bg-purple-50 border-purple-100",
      iconBg: "bg-purple-500",
      checkColor: "text-purple-500",
      ctaColor: "border-purple-200 text-purple-700 hover:bg-purple-50",
      accent: "bg-purple-500/10",
    },
  ];

  return (
    <section id="roles" className="py-24 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px] translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/[0.15] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('landing.roles.label')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-display font-bold leading-tight mb-5 text-foreground tracking-tight">
            {t('landing.roles.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('landing.roles.description')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((role) => (
            <div
              key={role.title}
              className="group flex flex-col rounded-2xl bg-card border border-border/50 shadow-soft hover:shadow-premium hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              <div className={cn("relative h-3 bg-gradient-to-r", role.gradient)}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
              </div>

              <div className="flex flex-col flex-1 p-6">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-5 shadow-sm", role.iconBg)}>
                  <role.icon className="w-5 h-5 text-white" />
                </div>

                <h3 className="text-lg font-display font-bold text-foreground mb-4">
                  {role.title}
                </h3>

                <ul className="space-y-3 mb-6 flex-1">
                  {role.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5", role.accent)}>
                        <Check className={cn("w-3 h-3", role.checkColor)} />
                      </div>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full rounded-xl gap-2 font-semibold mt-auto transition-all",
                    role.ctaColor
                  )}
                  asChild
                >
                  <Link to={ROUTES.SIGNUP}>
                    {role.cta}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoleValueSection;

import { useState } from "react";
import { Sprout, Brain, Truck, ShoppingBag, CloudSun, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

const PlatformSection = () => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const modules = [
    {
      icon: Sprout,
      title: t('landing.platform.farmDataIntel'),
      description: t('landing.platform.farmDataIntelDesc'),
      color: "emerald",
      highlights: ["Crop diary with photos", "Growth stage tracking", "Farmland management"],
    },
    {
      icon: Brain,
      title: t('landing.platform.aiPrediction'),
      description: t('landing.platform.aiPredictionDesc'),
      color: "blue",
      highlights: ["Market price forecasts", "Harvest timing", "Weather-aware advice"],
    },
    {
      icon: Truck,
      title: t('landing.platform.logisticsOpt'),
      description: t('landing.platform.logisticsOptDesc'),
      color: "amber",
      highlights: ["Load aggregation", "Real-time GPS tracking", "Route optimization"],
    },
    {
      icon: ShoppingBag,
      title: t('landing.platform.coldStorage'),
      description: t('landing.platform.coldStorageDesc'),
      color: "purple",
      highlights: ["Direct buyer connection", "Transparent pricing", "Order management"],
    },
    {
      icon: CloudSun,
      title: t('landing.platform.advisory'),
      description: t('landing.platform.advisoryDesc'),
      color: "cyan",
      highlights: ["Hyperlocal forecasts", "Soil health reports", "Seasonal guidance"],
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string; text: string; activeBg: string }> = {
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200", text: "text-emerald-700", activeBg: "bg-emerald-500" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200", text: "text-blue-700", activeBg: "bg-blue-500" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-200", text: "text-amber-700", activeBg: "bg-amber-500" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-200", text: "text-purple-700", activeBg: "bg-purple-500" },
    cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", border: "border-cyan-200", text: "text-cyan-700", activeBg: "bg-cyan-500" },
  };

  const active = modules[activeIndex];
  const colors = colorMap[active.color];

  return (
    <section id="platform" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px] -translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] border border-primary/[0.15] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('landing.platform.label')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-display font-bold leading-tight mb-5 text-foreground tracking-tight">
            {t('landing.platform.title')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('landing.platform.description')}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-0">
          <div className="lg:col-span-2 space-y-2">
            {modules.map((mod, idx) => {
              const c = colorMap[mod.color];
              const isActive = idx === activeIndex;
              return (
                <button
                  key={mod.title}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center gap-4 group",
                    isActive
                      ? `${c.bg} border ${c.border} shadow-soft`
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                    isActive ? `${c.activeBg} text-white shadow-sm` : `${c.bg} ${c.icon}`
                  )}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "text-sm font-bold transition-colors",
                      isActive ? c.text : "text-foreground"
                    )}>
                      {mod.title}
                    </h3>
                    {isActive && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mod.description}</p>
                    )}
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 flex-shrink-0 transition-all",
                    isActive ? `${c.icon} translate-x-0.5` : "text-muted-foreground/40"
                  )} />
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-3 lg:pl-8">
            <div className={cn(
              "relative p-8 rounded-2xl border shadow-medium transition-all duration-500",
              colors.bg, colors.border
            )}>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shadow-sm", colors.activeBg)}>
                  <active.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className={cn("text-xl font-display font-bold", colors.text)}>
                    {active.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{active.description}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {active.highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 border border-white shadow-sm"
                  >
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", colors.activeBg)}>
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 lg:hidden">
          {modules.map((mod, idx) => {
            const c = colorMap[mod.color];
            return (
              <button
                key={mod.title}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "p-3 rounded-xl text-center transition-all",
                  idx === activeIndex
                    ? `${c.bg} border ${c.border} shadow-soft`
                    : "bg-card border border-border/50 hover:border-border"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5",
                  idx === activeIndex ? `${c.activeBg} text-white` : `${c.bg} ${c.icon}`
                )}>
                  <mod.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground line-clamp-1">{mod.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PlatformSection;

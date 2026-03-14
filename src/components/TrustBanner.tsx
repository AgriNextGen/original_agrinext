import { Users, UserCheck, MapPin, Truck } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const TrustBanner = () => {
  const { t } = useLanguage();

  const stats = [
    { icon: Users, value: "500+", label: t('landing.trust.farmers') },
    { icon: UserCheck, value: "50+", label: t('landing.trust.agents') },
    { icon: MapPin, value: "100+", label: t('landing.trust.villages') },
    { icon: Truck, value: "200+", label: t('landing.trust.trips') },
  ];

  return (
    <section className="py-14 md:py-20 bg-gradient-premium relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.12] backdrop-blur-sm flex items-center justify-center mx-auto mb-4 group-hover:bg-white/[0.18] group-hover:scale-110 transition-all duration-300 ring-1 ring-white/10">
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-3xl sm:text-4xl font-display font-extrabold text-primary-foreground mb-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm text-primary-foreground/75 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-primary-foreground/50 text-xs mt-8 tracking-wide">
          Karnataka, India
        </p>
      </div>
    </section>
  );
};

export default TrustBanner;

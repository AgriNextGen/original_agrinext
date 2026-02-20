import { 
  Globe2, 
  MessageSquare, 
  Truck, 
  Bell, 
  BarChart3,
  QrCode 
} from "lucide-react";

const features = [
  {
    icon: Globe2,
    title: "Multi-Role Platform",
    description: "Dashboards for each stakeholder with role-based workflows.",
  },
  {
    icon: MessageSquare,
    title: "Multilingual Support",
    description: "Regional language chat/voice support for adoption.",
  },
  {
    icon: Truck,
    title: "Smart Logistics",
    description: "Route suggestions + reverse-load planning (assistive).",
  },
  {
    icon: Bell,
    title: "Real-time Updates",
    description: "Live status updates across crops, transport, and orders.",
  },
  {
    icon: BarChart3,
    title: "Market Intelligence",
    description: "Price signals and demand visibility (decision support).",
  },
  {
    icon: QrCode,
    title: "Traceability Ready",
    description: "Digital identity for produce transparency.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 md:py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-primary/3 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-accent/5 blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Capabilities</span>
          <h2 className="text-[22px] sm:text-[28px] md:text-[34px] font-display font-bold mt-3 mb-4 text-foreground">
            What the Platform Enables
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            System-grade tools designed for real agricultural operations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-5 md:p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

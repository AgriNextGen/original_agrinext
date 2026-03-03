const stats = [
  { value: "5", label: "Roles Supported" },
  { value: "30+", label: "Districts in Karnataka" },
  { value: "2", label: "Languages" },
  { value: "100%", label: "Open Source" },
];

const StatsSection = () => {
  return (
    <section className="py-20 bg-gradient-hero relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-primary-foreground/30" />
        <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full border-2 border-primary-foreground/20" />
        <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-primary-foreground/10" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-primary-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-primary-foreground/80 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

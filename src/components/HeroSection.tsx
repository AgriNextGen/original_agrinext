import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Users, ShoppingBag, Truck, ClipboardList, Sprout, HandshakeIcon } from "lucide-react";

const HeroSection = () => {
  const roleCards = [
    { icon: Users, label: "Farmers", desc: "Track crops, request transport, and sell with transparency.", color: "bg-primary" },
    { icon: ShoppingBag, label: "Buyers", desc: "Source verified produce with traceable origin.", color: "bg-primary" },
    { icon: ClipboardList, label: "Agents", desc: "Onboard and support farmers with field verification.", color: "bg-primary" },
    { icon: Truck, label: "Transport", desc: "Accept loads, optimize routes, reduce empty runs.", color: "bg-primary" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50" />
      
      {/* Soft glow accent behind content */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="text-center">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/8 border border-primary/15 mb-10 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            <span className="text-sm font-medium text-primary tracking-wide">Connecting India's Agricultural Ecosystem</span>
          </div>

          {/* Premium Headline */}
          <h1 className="text-[32px] sm:text-[44px] md:text-[52px] lg:text-[60px] font-display font-bold leading-[1.1] mb-6 animate-slide-up text-foreground">
            India's Agricultural{" "}
            <span className="text-gradient-hero">Operating System</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Unifying farmers, agents, transport, and buyers into one real-world platform—built for hyperlocal trade, traceability, and efficient logistics.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" asChild className="min-h-[48px] px-8 text-base font-semibold rounded-2xl btn-hover-darken">
              <Link to="/signup" className="gap-2">
                Join the Pilot Program
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild className="min-h-[48px] px-8 text-base font-medium rounded-2xl border-2">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>

          {/* Audience Path Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-16 animate-slide-up text-sm" style={{ animationDelay: "0.25s" }}>
            <span className="text-muted-foreground font-medium">Choose your path:</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="ghost" size="sm" asChild className="gap-2 text-primary hover:bg-primary/10">
                <Link to="/signup">
                  <Sprout className="w-4 h-4" />
                  I'm a Farmer / Agent
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted">
                <Link to="/contact">
                  <HandshakeIcon className="w-4 h-4" />
                  I'm a Buyer / Partner
                </Link>
              </Button>
            </div>
          </div>

          {/* Premium Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {roleCards.map((role) => (
              <div
                key={role.label}
                className="group p-5 md:p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <role.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{role.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

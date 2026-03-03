import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf } from "lucide-react";
const CTASection = () => {
  return <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Decorative background */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-card border border-border/50 shadow-medium -z-10" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative z-10 px-8 py-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Leaf className="w-4 h-4" />
              <span>Pilot Program Open</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Ready to Join the Pilot?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Be among the first farmers, buyers, and agents to transform agriculture in Karnataka.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">Talk to Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default CTASection;
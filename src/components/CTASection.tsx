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

          
        </div>
      </div>
    </section>;
};
export default CTASection;
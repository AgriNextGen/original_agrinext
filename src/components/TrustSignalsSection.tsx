import { MapPin, Globe, Activity, QrCode, CheckCircle2, Cpu } from "lucide-react";
const trustSignals = [{
  icon: MapPin,
  text: "District-first rollout approach"
}, {
  icon: Globe,
  text: "Multilingual support for adoption"
}, {
  icon: Activity,
  text: "Real-time visibility across the chain"
}, {
  icon: QrCode,
  text: "Traceability-ready for premium markets"
}];
const TrustSignalsSection = () => {
  return <section className="py-16 md:py-20 bg-background relative overflow-hidden">
       <div className="container mx-auto px-4 max-w-5xl">
         {/* Built for India Trust Section */}
         <div className="text-center mb-12">
           <span className="text-primary font-semibold text-sm uppercase tracking-wider">Built for India</span>
           <h2 className="text-[22px] sm:text-[28px] md:text-[34px] font-display font-bold mt-3 mb-4 text-foreground">
             Designed for Ground Reality
           </h2>
         </div>
 
         {/* Trust Signals Grid */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
           {trustSignals.map(signal => <div key={signal.text} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60 shadow-soft">
               <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                 <signal.icon className="w-5 h-5 text-primary" />
               </div>
               <span className="text-sm font-medium text-foreground leading-snug">{signal.text}</span>
             </div>)}
         </div>
 
         {/* Pilot Ready Banner */}
         
       </div>
     </section>;
};
export default TrustSignalsSection;
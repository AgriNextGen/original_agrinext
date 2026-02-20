 import { Database, Brain, Truck, Shield } from "lucide-react";
 
 const steps = [
   {
     number: "01",
     icon: Database,
     title: "Farm & Crop Data Captured",
     description: "Farmers and agents digitize farm records, crop details, and soil reports.",
   },
   {
     number: "02",
     icon: Brain,
     title: "AI-Assisted Planning",
     description: "Smart advisories, prioritization, and decision support for better outcomes.",
   },
   {
     number: "03",
     icon: Truck,
     title: "Market + Transport Execution",
     description: "Seamless logistics coordination and marketplace connections.",
   },
   {
     number: "04",
     icon: Shield,
     title: "Traceability & Trust",
     description: "Digital identity for produce transparency that buyers can verify.",
   },
 ];
 
 const HowItWorksSection = () => {
   return (
     <section className="py-20 md:py-24 bg-background relative overflow-hidden">
       <div className="container mx-auto px-4 max-w-6xl">
         {/* Section Header */}
         <div className="text-center max-w-2xl mx-auto mb-16">
           <span className="text-primary font-semibold text-sm uppercase tracking-wider">How It Works</span>
           <h2 className="text-[22px] sm:text-[28px] md:text-[34px] font-display font-bold mt-3 mb-4 text-foreground">
             How AgriNext Gen Works
           </h2>
           <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
             A streamlined flow from farm data to verified delivery.
           </p>
         </div>
 
         {/* Desktop: Horizontal Stepper */}
         <div className="hidden lg:grid lg:grid-cols-4 gap-6 relative">
           {/* Connection Line */}
           <div className="absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
           
           {steps.map((step, index) => (
             <div key={step.number} className="relative text-center">
               {/* Number Badge */}
               <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-premium flex items-center justify-center shadow-glow relative z-10">
                 <step.icon className="w-10 h-10 text-primary-foreground" />
               </div>
               
               {/* Step Number Chip */}
               <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-4">
                 {index + 1}
               </div>
               
               <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                 {step.title}
               </h3>
               <p className="text-sm text-muted-foreground leading-relaxed px-2">
                 {step.description}
               </p>
             </div>
           ))}
         </div>
 
         {/* Mobile/Tablet: Stacked Cards */}
         <div className="lg:hidden space-y-4">
           {steps.map((step, index) => (
             <div 
               key={step.number} 
               className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft"
             >
               <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-premium flex items-center justify-center">
                 <step.icon className="w-7 h-7 text-primary-foreground" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                     {index + 1}
                   </span>
                   <h3 className="text-base font-display font-semibold text-foreground">
                     {step.title}
                   </h3>
                 </div>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                   {step.description}
                 </p>
               </div>
             </div>
           ))}
         </div>
       </div>
     </section>
   );
 };
 
 export default HowItWorksSection;
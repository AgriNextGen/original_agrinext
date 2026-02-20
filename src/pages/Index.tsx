import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TrustSignalsSection from "@/components/TrustSignalsSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const roleRoutes: Record<string, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/marketplace/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Parse OAuth errors from URL hash and redirect authenticated users
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description") || params.get("error");
      if (errorCode || errorDesc) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        toast({
          title: "Authentication failed",
          description: errorDesc || "Please try again.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }
    }

    if (!loading && user && userRole && roleRoutes[userRole]) {
      navigate(roleRoutes[userRole], { replace: true });
    }
  }, [user, userRole, loading, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TrustSignalsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;

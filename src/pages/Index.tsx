import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import PlatformSection from "@/components/PlatformSection";
import RoleValueSection from "@/components/RoleValueSection";
import WorkflowSection from "@/components/WorkflowSection";
import TrustBanner from "@/components/TrustBanner";
import ImpactSection from "@/components/ImpactSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { ROUTES, ROLE_DASHBOARD_ROUTES } from "@/lib/routes";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description") || params.get("error");
      if (errorCode || errorDesc) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        toast({
          title: t('auth.loginFailed'),
          description: errorDesc || t('auth.unexpectedError'),
          variant: "destructive",
        });
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }
    }

    if (!loading && user && userRole && ROLE_DASHBOARD_ROUTES[userRole]) {
      navigate(ROLE_DASHBOARD_ROUTES[userRole], { replace: true });
    }
  }, [user, userRole, loading, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <PlatformSection />
        <RoleValueSection />
        <WorkflowSection />
        <TrustBanner />
        <ImpactSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

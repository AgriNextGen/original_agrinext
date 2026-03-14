import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ROLE_SETUP_TIMEOUT_MS = 10000;

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, userRole, refreshRole, activeRole } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [roleSetupTimedOut, setRoleSetupTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleManualRetry = useCallback(() => {
    setRoleSetupTimedOut(false);
    setRetryCount((c) => c + 1);
    refreshRole();
  }, [refreshRole]);

  useEffect(() => {
    const effectiveRole = activeRole ?? userRole;
    if (!allowedRoles || !user || effectiveRole) return;

    setRoleSetupTimedOut(false);

    const retryInterval = setInterval(() => {
      refreshRole();
    }, 1500);

    const timeoutId = setTimeout(() => {
      clearInterval(retryInterval);
      setRoleSetupTimedOut(true);
    }, ROLE_SETUP_TIMEOUT_MS);

    return () => {
      clearInterval(retryInterval);
      clearTimeout(timeoutId);
    };
  }, [allowedRoles, user, userRole, activeRole, refreshRole, retryCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20" />
            <Loader2 className="absolute inset-0 w-12 h-12 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">{t('shared.protectedRoute.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRole = activeRole ?? userRole;
  if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole)) {
    const targetRoute = ROLE_DASHBOARD_ROUTES[effectiveRole] || "/";
    return <Navigate to={targetRoute} replace />;
  }

  if (allowedRoles && !effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20" />
            {!roleSetupTimedOut && (
              <Loader2 className="absolute inset-0 w-12 h-12 text-primary animate-spin" />
            )}
          </div>
          {roleSetupTimedOut ? (
            <>
              <p className="text-foreground text-sm font-medium">
                {t('shared.protectedRoute.setupSlow')}
              </p>
              <p className="text-muted-foreground text-xs text-center max-w-xs">
                {t('shared.protectedRoute.slowConnection')}
              </p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" size="sm" onClick={handleManualRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('shared.protectedRoute.retry')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate("/login", {
                      state: {
                        from: location,
                        error: t('shared.protectedRoute.unableToLoad'),
                      },
                    })
                  }
                >
                  {t('shared.protectedRoute.signInAgain')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">{t('shared.protectedRoute.settingUp')}</p>
              <p className="text-muted-foreground text-xs">{t('shared.protectedRoute.fewSeconds')}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

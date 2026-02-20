import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ROLE_SETUP_TIMEOUT_MS = 5000;

const roleRoutes: Record<string, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/marketplace/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, userRole, refreshRole } = useAuth();
  const location = useLocation();
  const [roleSetupTimedOut, setRoleSetupTimedOut] = useState(false);

  // If user doesn't have a role yet: retry fetchUserRole and timeout after 5s
  useEffect(() => {
    if (!allowedRoles || !user || userRole) return;

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
  }, [allowedRoles, user, userRole, refreshRole]);

  // After timeout, redirect to login so user can retry
  if (roleSetupTimedOut) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, error: "Unable to load your account. Please try signing in again." }}
        replace
      />
    );
  }

  // Show loading state with a better UI
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20" />
            <Loader2 className="absolute inset-0 w-12 h-12 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user has a role and it's not in the allowed roles, redirect to their dashboard
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    const targetRoute = roleRoutes[userRole] || "/";
    return <Navigate to={targetRoute} replace />;
  }

  // If user doesn't have a role yet but is authenticated, show loading with timeout
  // After ROLE_SETUP_TIMEOUT_MS, redirect to login so user can retry
  if (allowedRoles && !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20" />
            <Loader2 className="absolute inset-0 w-12 h-12 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">Setting up your account...</p>
          <p className="text-muted-foreground text-xs">If this takes too long, you will be redirected to sign in again.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

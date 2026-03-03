import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, LogIn, LayoutDashboard } from "lucide-react";

const roleRoutes: Record<string, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/marketplace/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const dashboardPath = userRole ? roleRoutes[userRole] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          <h1 className="mb-2 text-6xl font-bold text-primary">404</h1>
          <p className="mb-2 text-xl font-semibold text-foreground">Page not found</p>
          <p className="mb-6 text-muted-foreground text-sm">
            The page <code className="bg-muted px-1 rounded text-xs">{location.pathname}</code> doesn't exist.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            {user && dashboardPath ? (
              <>
                <Button onClick={() => navigate(dashboardPath)} className="gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
                <Button variant="outline" onClick={() => navigate("/login")} className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">Useful links</p>
            <div className="flex flex-wrap gap-2 justify-center text-sm">
              <a href="/about" className="text-primary hover:underline">About</a>
              <span className="text-muted-foreground">·</span>
              <a href="/contact" className="text-primary hover:underline">Contact</a>
              <span className="text-muted-foreground">·</span>
              <a href="/signup" className="text-primary hover:underline">Sign Up</a>
              <span className="text-muted-foreground">·</span>
              <a href="/marketplace/browse" className="text-primary hover:underline">Browse</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;

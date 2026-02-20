import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Phone, Users, ShoppingBag, ClipboardList, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { normalizePhone } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleRoutes: Record<string, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/marketplace/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

const LOGIN_ROLES: { id: AppRole; labelKey: string; icon: typeof Users }[] = [
  { id: "farmer", labelKey: "roles.farmer", icon: Users },
  { id: "buyer", labelKey: "roles.buyer", icon: ShoppingBag },
  { id: "agent", labelKey: "roles.agent", icon: ClipboardList },
  { id: "logistics", labelKey: "roles.logistics", icon: Truck },
];

const Login = () => {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Show error from redirect (e.g. ProtectedRoute timeout)
  useEffect(() => {
    const stateError = (location.state as { error?: string } | null)?.error;
    if (stateError) {
      setError(stateError);
      toast({ title: t("auth.login_failed"), description: stateError, variant: "destructive" });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, toast, t, navigate, location.pathname]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      navigate(roleRoutes[userRole] || "/");
    }
  }, [user, userRole, navigate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!selectedRole) {
        setError(t("auth.select_role_to_login"));
        toast({ title: t("common.error"), description: t("auth.select_role_to_login"), variant: "destructive" });
        return;
      }

      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone || normalizedPhone.length < 12) {
        setError(t("validation.phone_required"));
        toast({ title: t("common.error"), description: t("validation.phone_required"), variant: "destructive" });
        return;
      }

      if (!password) {
        setError(t("validation.required"));
        toast({ title: t("common.error"), description: t("validation.required"), variant: "destructive" });
        return;
      }

      setIsLoading(true);

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/login-by-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, password, role: selectedRole }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(t("auth.invalid_credentials"));
          toast({ title: t("auth.login_failed"), description: t("auth.invalid_credentials"), variant: "destructive" });
          return;
        }

        if (!data.access_token || !data.refresh_token) {
          setError(t("auth.invalid_credentials"));
          toast({ title: t("auth.login_failed"), description: t("auth.invalid_credentials"), variant: "destructive" });
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          setError(sessionError.message);
          toast({ title: t("auth.login_failed"), description: sessionError.message, variant: "destructive" });
          return;
        }

        toast({ title: t("auth.welcome_back"), description: t("auth.login_success") });
        navigate(roleRoutes[selectedRole] || "/");
      } catch {
        setError(t("common.error"));
        toast({ title: t("common.error"), description: t("common.error"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRole, phone, password, supabaseUrl, toast, t, navigate]
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">
              AgriNext <span className="text-primary">Gen</span>
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("auth.welcome_back")}</h1>
            <p className="text-muted-foreground">{t("auth.sign_in_continue")}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Role selector */}
          <div className="mb-5">
            <Label className="mb-2 block">{t("auth.select_role_to_login")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {LOGIN_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.id);
                    setError(null);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                    selectedRole === r.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <r.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t(r.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.phone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 h-12"
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 pr-10 h-12"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("auth.signing_in")}
                </>
              ) : (
                <>
                  {t("auth.sign_in")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Google OAuth */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">{t("auth.or_continue_with")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isLoading}
            type="button"
            onClick={async () => {
              setError(null);
              setIsLoading(true);
              try {
                const { error: oauthError } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: { prompt: "select_account" },
                  },
                });
                if (oauthError) {
                  setError(oauthError.message);
                  toast({ title: t("auth.login_failed"), description: oauthError.message, variant: "destructive" });
                }
              } catch {
                setError(t("common.error"));
                toast({ title: t("common.error"), description: t("common.error"), variant: "destructive" });
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t("auth.continue_google")}
          </Button>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-muted-foreground">
            {t("auth.no_account")}{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              {t("auth.sign_up")}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-20 right-20 w-40 h-40 rounded-full border-2 border-primary-foreground/20" />
        <div className="absolute bottom-20 left-20 w-60 h-60 rounded-full border-2 border-primary-foreground/10" />
        <div className="absolute top-1/3 left-1/4 w-20 h-20 rounded-full bg-primary-foreground/10" />
        <div className="text-center text-primary-foreground relative z-10">
          <h2 className="text-4xl font-display font-bold mb-4">Welcome to AgriNext Gen</h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Connect with buyers, manage your farm, and grow your agricultural business with India's leading agtech
            platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

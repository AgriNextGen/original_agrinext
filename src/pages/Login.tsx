import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Phone, Users, ShoppingBag, ClipboardList, Truck, Shield, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { normalizePhone } from "@/lib/auth";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/routes";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type LoginByPhoneError = {
  error?: string;
  message?: string;
  retry_at?: string;
  retry_after_seconds?: number;
};

const LOGIN_ROLES: { id: AppRole; labelKey: string; icon: typeof Users }[] = [
  { id: "farmer", labelKey: "roles.farmer", icon: Users },
  { id: "buyer", labelKey: "roles.buyer", icon: ShoppingBag },
  { id: "agent", labelKey: "roles.agent", icon: ClipboardList },
  { id: "logistics", labelKey: "roles.logistics", icon: Truck },
  { id: "vendor", labelKey: "roles.vendor", icon: Store },
  { id: "admin", labelKey: "roles.admin", icon: Shield },
];

function formatCooldown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function parseLockoutUntilMs(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as LoginByPhoneError;
  if (typeof data.retry_after_seconds === "number" && Number.isFinite(data.retry_after_seconds) && data.retry_after_seconds > 0) {
    return Date.now() + (data.retry_after_seconds * 1000);
  }
  if (typeof data.retry_at === "string") {
    const parsed = Date.parse(data.retry_at);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getLoginErrorMessage(status: number, payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as LoginByPhoneError;
  if (typeof data.message === "string" && data.message.trim()) {
    if (status === 429 || data.error === "temporarily_blocked" || data.error === "account_locked") {
      return data.message;
    }
  }
  return fallback;
}

const Login = () => {
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutUntilMs, setLockoutUntilMs] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Show error from redirect (e.g. ProtectedRoute timeout)
  useEffect(() => {
    const state = location.state as { error?: string; loginTimestamp?: number } | null;
    if (state?.error) {
      setError(state.error);
      toast({ title: t("auth.login_failed"), description: state.error, variant: "destructive" });
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.loginTimestamp && Date.now() - state.loginTimestamp > 15000) {
      const msg = t("auth.login_timeout") || "Login took too long. Please try again.";
      setError(msg);
      toast({ title: t("auth.login_failed"), description: msg, variant: "destructive" });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, toast, t, navigate, location.pathname]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      navigate(ROLE_DASHBOARD_ROUTES[userRole] || "/");
    }
  }, [user, userRole, navigate]);

  useEffect(() => {
    if (!lockoutUntilMs) {
      setLockoutRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((lockoutUntilMs - Date.now()) / 1000));
      setLockoutRemainingSeconds(seconds);
      if (seconds <= 0) {
        setLockoutUntilMs(null);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutUntilMs]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (lockoutRemainingSeconds > 0) {
        const msg = `Too many failed attempts. Try again in ${formatCooldown(lockoutRemainingSeconds)}.`;
        setError(msg);
        toast({ title: t("auth.login_failed"), description: msg, variant: "destructive" });
        return;
      }

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let res: Response;
        try {
          res = await fetch(`${supabaseUrl}/functions/v1/login-by-phone`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
            },
            body: JSON.stringify({ phone: normalizedPhone, password, role: selectedRole }),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          const isTimeout = fetchErr instanceof DOMException && fetchErr.name === "AbortError";
          const msg = isTimeout
            ? t("auth.login_timeout") || "Login is taking too long. Please check your connection and try again."
            : t("auth.network_error") || "Could not reach the server. Please check your internet connection.";
          setError(msg);
          toast({ title: t("auth.login_failed"), description: msg, variant: "destructive" });
          return;
        } finally {
          clearTimeout(timeoutId);
        }

        let data: any;
        const contentType = res.headers.get("content-type") ?? "";
        try {
          data = contentType.includes("application/json") ? await res.json() : null;
        } catch {
          data = null;
        }
        if (data == null || typeof data !== "object") {
          const serverMsg =
            res.status >= 500
              ? (t("auth.server_unavailable") ||
                "Server is temporarily unavailable. Please try again in a few minutes.")
              : res.status === 404
                ? (t("auth.login_endpoint_unavailable") || "Login service is not available. Please contact support.")
                : (t("auth.invalid_credentials") || "Invalid credentials.");
          setError(serverMsg);
          toast({ title: t("auth.login_failed"), description: serverMsg, variant: "destructive" });
          return;
        }

        if (!res.ok) {
          const parsedLockout = parseLockoutUntilMs(data);
          if (parsedLockout && parsedLockout > Date.now()) {
            setLockoutUntilMs(parsedLockout);
          }
          const message = getLoginErrorMessage(res.status, data, t("auth.invalid_credentials"));
          setError(message);
          toast({ title: t("auth.login_failed"), description: message, variant: "destructive" });
          return;
        }

        const tokens = data?.data ?? data;
        if (!tokens?.access_token || !tokens?.refresh_token) {
          setError(t("auth.invalid_credentials"));
          toast({ title: t("auth.login_failed"), description: t("auth.invalid_credentials"), variant: "destructive" });
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });

        if (sessionError) {
          setError(sessionError.message);
          toast({ title: t("auth.login_failed"), description: sessionError.message, variant: "destructive" });
          return;
        }

        toast({ title: t("auth.welcome_back"), description: t("auth.login_success") });
        setLockoutUntilMs(null);
        
        const destination = ROLE_DASHBOARD_ROUTES[selectedRole] || "/";
        navigate(destination, { state: { loginTimestamp: Date.now() } });
      } catch {
        setError(t("auth.network_error") || "Something went wrong. Please try again.");
        toast({ title: t("common.error"), description: t("auth.network_error") || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRole, phone, password, supabaseUrl, supabaseAnonKey, toast, t, navigate, lockoutRemainingSeconds]
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
              <div className="text-sm text-destructive">
                <p>{error}</p>
                {lockoutRemainingSeconds > 0 && (
                  <p className="mt-1 font-medium">
                    Retry in {formatCooldown(lockoutRemainingSeconds)}
                  </p>
                )}
              </div>
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

            <div className="relative">
              <Button
                type="submit"
                variant="hero"
                className="w-full"
                size="lg"
                disabled={isLoading || lockoutRemainingSeconds > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("auth.signing_in")}
                  </>
                ) : lockoutRemainingSeconds > 0 ? (
                  <>
                    Try again in {formatCooldown(lockoutRemainingSeconds)}
                  </>
                ) : (
                  <>
                    {t("auth.sign_in")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              {isLoading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg">
                  <div className="h-full bg-primary-foreground/40 animate-[login-progress_12s_ease-in-out_forwards]" style={{ width: '0%', animation: 'login-progress 12s ease-in-out forwards' }} />
                  <style>{`@keyframes login-progress { 0% { width: 0%; } 60% { width: 70%; } 90% { width: 88%; } 100% { width: 95%; } }`}</style>
                </div>
              )}
            </div>
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

      {/* Right Side - Agricultural Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative agricultural elements */}
        <div className="absolute top-10 right-16 w-48 h-48 rounded-full border border-primary-foreground/10" />
        <div className="absolute bottom-16 left-12 w-72 h-72 rounded-full border border-primary-foreground/5" />
        <div className="absolute top-1/4 left-1/3 w-24 h-24 rounded-full bg-primary-foreground/5" />
        <div className="absolute bottom-1/3 right-1/4 w-16 h-16 rounded-full bg-primary-foreground/8" />

        <div className="text-center text-primary-foreground relative z-10 max-w-lg">
          {/* Agricultural icon cluster */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
              <Leaf className="w-7 h-7" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm mt-4">
              <Users className="w-7 h-7" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center backdrop-blur-sm">
              <Truck className="w-7 h-7" />
            </div>
          </div>

          <h2 className="text-4xl font-display font-bold mb-4">
            {({
              farmer: t('auth.heroTitleFarmer'),
              buyer: t('auth.heroTitleBuyer'),
              agent: t('auth.heroTitleAgent'),
              logistics: t('auth.heroTitleLogistics'),
              vendor: t('auth.heroTitleVendor'),
              admin: t('auth.heroTitleAdmin'),
            } as Record<string, string>)[selectedRole] ?? t('auth.welcomeToAgriNextGen')}
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            {({
              farmer: t('auth.heroSubtitleFarmer'),
              buyer: t('auth.heroSubtitleBuyer'),
              agent: t('auth.heroSubtitleAgent'),
              logistics: t('auth.heroSubtitleLogistics'),
              vendor: t('auth.heroSubtitleVendor'),
              admin: t('auth.heroSubtitleAdmin'),
            } as Record<string, string>)[selectedRole] ?? t('auth.connectWithBuyers')}
          </p>

          {/* Trust stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-primary-foreground/15">
            <div>
              <p className="text-2xl font-bold">500+</p>
              <p className="text-xs text-primary-foreground/60 mt-1">{t('roles.farmer')}s</p>
            </div>
            <div>
              <p className="text-2xl font-bold">50+</p>
              <p className="text-xs text-primary-foreground/60 mt-1">{t('nav.group.marketLogistics')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">100+</p>
              <p className="text-xs text-primary-foreground/60 mt-1">{t('nav.orders')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

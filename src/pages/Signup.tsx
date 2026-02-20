import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Mail, Lock, User, Phone, ArrowRight, Users, ShoppingBag, ClipboardList, Truck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone, getAuthEmailFromPhone } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/hooks/useLanguage";

type AppRole = Database["public"]["Enums"]["app_role"];

const getRoles = (t: (key: string) => string): { id: AppRole; label: string; icon: typeof Users; description: string }[] => [
  { id: "farmer", label: t("roles.farmer"), icon: Users, description: t("roles.farmer_description") },
  { id: "buyer", label: t("roles.buyer"), icon: ShoppingBag, description: t("roles.buyer_description") },
  { id: "agent", label: t("roles.agent"), icon: ClipboardList, description: t("roles.agent_description") },
  { id: "logistics", label: t("roles.logistics"), icon: Truck, description: t("roles.logistics_description") },
];

const roleRoutes: Record<string, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/marketplace/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

const Signup = () => {
  const { t } = useLanguage();
  const roles = getRoles(t);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole, refreshRole } = useAuth();

  // Redirect if already logged in with role
  useEffect(() => {
    if (user && userRole) {
      navigate(roleRoutes[userRole] || "/");
    }
  }, [user, userRole, navigate]);

  // Input validation: name, phone, password required; email optional
  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      return t("validation.name_required");
    }
    const normalizedPhone = normalizePhone(formData.phone);
    if (!normalizedPhone || normalizedPhone.length < 12) {
      return t("validation.phone_required");
    }
    if (formData.password.length < 6) {
      return t("validation.password_min");
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return t("validation.invalid_email");
    }
    return null;
  }, [formData, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (step === 1 && selectedRole) {
      setStep(2);
      return;
    }
    
    if (step === 2) {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        toast({
          title: t("common.error"),
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      try {
        const redirectUrl = `${window.location.origin}/`;
        const normalizedPhone = normalizePhone(formData.phone);
        const authEmail = formData.email.trim()
          ? formData.email.trim().toLowerCase()
          : getAuthEmailFromPhone(formData.phone);

        // Sign up: email optional; use synthetic phone@agrinext.local when not provided
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: formData.name.trim(),
              phone: normalizedPhone,
              role: selectedRole,
              auth_email: authEmail,
            },
          },
        });

        if (authError) {
          if (authError.message.toLowerCase().includes("rate limit")) {
            setError(t("auth.rate_limit_exceeded"));
            toast({
              title: t("auth.signup_failed"),
              description: t("auth.rate_limit_retry_hint"),
              variant: "destructive",
            });
          } else if (authError.message.includes("already registered")) {
            setError(t("auth.phone_or_email_exists"));
            toast({
              title: t("auth.account_exists"),
              description: t("auth.phone_or_email_exists"),
              variant: "destructive",
            });
          } else {
            setError(authError.message);
            toast({
              title: t("auth.signup_failed"),
              description: authError.message,
              variant: "destructive",
            });
          }
          return;
        }

        if (authData.user) {
          // Email confirmation required: no session until user clicks link
          if (!authData.session) {
            toast({
              title: t("auth.email_confirmation_required"),
              description: t("auth.check_email_confirm"),
            });
            setError(null);
            return;
          }

          // Wait a moment for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 500));

          // Assign role explicitly (backup in case trigger doesn't work)
          const { error: roleError } = await supabase
            .from("user_roles")
            .upsert({
              user_id: authData.user.id,
              role: selectedRole as AppRole,
            }, { onConflict: 'user_id' });

          if (roleError) {
            console.error("Role assignment error:", roleError);
          }

          // Create role-specific profile
          if (selectedRole === "buyer") {
            await supabase
              .from("buyers")
              .upsert({
                user_id: authData.user.id,
                name: formData.name.trim(),
                phone: normalizedPhone || null,
              }, { onConflict: 'user_id' });
          } else if (selectedRole === "logistics") {
            await supabase
              .from("transporters")
              .upsert({
                user_id: authData.user.id,
                name: formData.name.trim(),
                phone: normalizedPhone || null,
              }, { onConflict: 'user_id' });
          }

          // Ensure auth_email is in profiles for login-by-phone
          await supabase.from("profiles").update({ auth_email: authEmail }).eq("id", authData.user.id);

          // Refresh the role in auth context
          await refreshRole();

          toast({
            title: t("auth.account_created"),
            description: t("auth.welcome_agrinext"),
          });

          // Navigate to the appropriate dashboard
          navigate(roleRoutes[selectedRole] || "/");
        }
      } catch (error) {
        console.error("Signup error:", error);
        setError(t("common.error"));
        toast({
          title: t("common.error"),
          description: t("common.error"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const selectedRoleInfo = useMemo(() => 
    roles.find(r => r.id === selectedRole),
    [selectedRole]
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

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Step 1: Role Selection */}
              <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                  {t("auth.join_agrinext")}
                </h1>
                <p className="text-muted-foreground">
                  {t("auth.select_role")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                        selectedRole === role.id
                          ? "border-primary bg-primary/5 shadow-glow"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                        selectedRole === role.id ? "bg-gradient-hero" : "bg-muted"
                      }`}>
                        <role.icon className={`w-5 h-5 ${
                          selectedRole === role.id ? "text-primary-foreground" : "text-muted-foreground"
                        }`} />
                      </div>
                      <h3 className="font-display font-semibold text-foreground">{role.label}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </button>
                  ))}
                </div>

                <Button 
                  type="submit" 
                  variant="hero" 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={!selectedRole}
                >
                  {t("common.continue")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: Account Details */}
              <div className="mb-8">
                <button
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
                  disabled={isLoading}
                  type="button"
                >
                  ← {t("common.back")}
                </button>
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                  {t("auth.create_account")}
                </h1>
                <p className="text-muted-foreground">
                  {t("auth.fill_details")}{" "}
                  <span className="text-primary font-medium capitalize">{selectedRoleInfo?.label}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth.full_name")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("auth.name_placeholder")}
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="pl-10 h-12"
                      disabled={isLoading}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="pl-10 h-12"
                      disabled={isLoading}
                      required
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
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 h-12"
                      disabled={isLoading}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("auth.password_hint")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email_optional")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.email_placeholder")}
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10 h-12"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("auth.email_optional_hint")}</p>
                </div>

                <Button type="submit" variant="hero" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("auth.creating_account")}
                    </>
                  ) : (
                    <>
                      {t("auth.create_account")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="my-6 flex items-center gap-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">{t("auth.or_continue_with")}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                  onClick={async () => {
                    setError(null);
                    sessionStorage.setItem("signup_role", selectedRole);
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
                        toast({ title: t("auth.signup_failed"), description: oauthError.message, variant: "destructive" });
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
              </form>
            </>
          )}

          {/* Login Link */}
          <p className="mt-8 text-center text-muted-foreground">
            {t("auth.have_account")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("auth.sign_in")}
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
          <h2 className="text-4xl font-display font-bold mb-4">
            Join Our Growing Community
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Become part of India's largest agricultural network. Connect, trade, 
            and grow with thousands of farmers and buyers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

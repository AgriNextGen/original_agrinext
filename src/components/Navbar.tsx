import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Leaf, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DevRoleSwitcher from "@/components/dev/DevRoleSwitcher";
import { ROUTES, ROLE_DASHBOARD_ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sectionLinks = [
    { label: t('landing.nav.features'), anchor: "#platform" },
    { label: t('landing.nav.howItWorks'), anchor: "#workflow" },
    { label: t('landing.nav.impact'), anchor: "#impact" },
    { label: t('landing.nav.contact'), anchor: "#cta" },
  ];
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  const getRoleDashboard = (role: string | null) => {
    return ROLE_DASHBOARD_ROUTES[role || ""] || ROUTES.HOME;
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return t('common.user');
    const key = `roles.${role}` as any;
    return t(key) || t('common.user');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.HOME);
  };

  const handleSectionClick = (anchor: string) => {
    setIsOpen(false);
    if (isLandingPage) {
      const el = document.querySelector(anchor);
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/" + anchor);
    }
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-card/98 backdrop-blur-xl border-b border-border/50 shadow-soft"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-display font-bold text-foreground tracking-tight">
                AgriNext <span className="text-primary">Gen</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase hidden sm:block">
                by AgriVectra Systems
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {!user && isLandingPage ? (
              <>
                {sectionLinks.map((link) => (
                  <button
                    key={link.anchor}
                    onClick={() => handleSectionClick(link.anchor)}
                    className="relative px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium text-sm rounded-lg hover:bg-muted/50"
                  >
                    {link.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                <Link to={ROUTES.HOME} className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium text-sm rounded-lg hover:bg-muted/50">
                  Home
                </Link>
                <Link to={ROUTES.ABOUT} className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium text-sm rounded-lg hover:bg-muted/50">
                  About
                </Link>
                <Link to={ROUTES.CONTACT} className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors font-medium text-sm rounded-lg hover:bg-muted/50">
                  Contact
                </Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <DevRoleSwitcher />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="capitalize font-medium">{getRoleLabel(userRole)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-medium">
                  <DropdownMenuItem onClick={() => navigate(getRoleDashboard(userRole))} className="rounded-lg">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t('nav.dashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('auth.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm px-4 py-2 rounded-lg hover:bg-muted/50"
                >
                  {t('common.signIn')}
                </Link>
                <Button asChild className="rounded-xl font-semibold bg-gradient-premium hover:brightness-110 hover:shadow-glow transition-all px-6 h-10">
                  <Link to={ROUTES.SIGNUP}>{t('common.signUp')}</Link>
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {!user && (
              <Button asChild size="sm" className="rounded-xl font-semibold bg-gradient-premium hover:brightness-110 transition-all text-xs px-4 h-9">
                <Link to={ROUTES.SIGNUP}>{t('common.signUp')}</Link>
              </Button>
            )}
            <button
              className="p-2.5 rounded-xl hover:bg-muted/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/40 animate-fade-in bg-card/98 backdrop-blur-xl rounded-b-2xl">
            <div className="flex flex-col gap-1">
              {!user && isLandingPage ? (
                <>
                  {sectionLinks.map((link) => (
                    <button
                      key={link.anchor}
                      onClick={() => handleSectionClick(link.anchor)}
                      className="px-4 py-3 text-left text-muted-foreground hover:text-foreground transition-colors font-medium rounded-xl hover:bg-muted/50"
                    >
                      {link.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <Link to={ROUTES.HOME} className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-xl hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                    Home
                  </Link>
                  <Link to={ROUTES.ABOUT} className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-xl hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                    About
                  </Link>
                  <Link to={ROUTES.CONTACT} className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-xl hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                    Contact
                  </Link>
                </>
              )}
              <div className="flex flex-col gap-2 px-4 pt-4 mt-2 border-t border-border/40">
                {user ? (
                  <>
                    <Button variant="outline" asChild onClick={() => setIsOpen(false)} className="rounded-xl min-h-[48px] justify-start">
                      <Link to={getRoleDashboard(userRole)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t('nav.dashboard')}
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={() => { handleSignOut(); setIsOpen(false); }} className="text-destructive rounded-xl min-h-[48px] justify-start">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('auth.signOut')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="rounded-xl min-h-[48px]">
                      <Link to={ROUTES.LOGIN}>{t('common.signIn')}</Link>
                    </Button>
                    <Button asChild className="rounded-xl min-h-[48px] bg-gradient-premium hover:brightness-110 shadow-glow">
                      <Link to={ROUTES.SIGNUP}>{t('common.signUp')}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

import { useState } from "react";
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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const { t } = useLanguage();

  const sectionLinks = [
    { label: t('landing.nav.platform'), anchor: "#platform" },
    { label: t('landing.nav.architecture'), anchor: "#architecture" },
    { label: t('landing.nav.intelligence'), anchor: "#intelligence" },
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/40 shadow-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16 md:h-[68px]">
          <Link to={ROUTES.HOME} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-premium flex items-center justify-center group-hover:scale-105 transition-transform">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-display font-bold text-foreground">
                AgriNext <span className="text-primary">Gen</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide hidden sm:block">
                by AgriVectra Systems
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {!user && isLandingPage ? (
              <>
                {sectionLinks.map((link) => (
                  <button
                    key={link.anchor}
                    onClick={() => handleSectionClick(link.anchor)}
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
                  >
                    {link.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                <Link to={ROUTES.HOME} className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
                  Home
                </Link>
                <Link to={ROUTES.ABOUT} className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
                  About
                </Link>
                <Link to={ROUTES.CONTACT} className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
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
                  <Button variant="outline" className="gap-2 rounded-xl">
                    <User className="w-4 h-4" />
                    <span className="capitalize">{getRoleLabel(userRole)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(getRoleDashboard(userRole))}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t('nav.dashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('auth.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" asChild className="rounded-xl border-border/80 hover:bg-muted/50 font-medium">
                  <Link to={ROUTES.LOGIN}>{t('common.signIn')}</Link>
                </Button>
                <Button asChild className="rounded-xl font-semibold bg-gradient-premium hover:brightness-90 transition-all">
                  <Link to={ROUTES.SIGNUP}>{t('common.signUp')}</Link>
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/40 animate-fade-in">
            <div className="flex flex-col gap-4">
              {!user && isLandingPage ? (
                <>
                  {sectionLinks.map((link) => (
                    <button
                      key={link.anchor}
                      onClick={() => handleSectionClick(link.anchor)}
                      className="px-4 py-2.5 text-left text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
                    >
                      {link.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <Link to={ROUTES.HOME} className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                    Home
                  </Link>
                  <Link to={ROUTES.ABOUT} className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                    About
                  </Link>
                  <Link to={ROUTES.CONTACT} className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                    Contact
                  </Link>
                </>
              )}
              <div className="flex flex-col gap-3 px-4 pt-4 border-t border-border/40">
                {user ? (
                  <>
                    <Button variant="outline" asChild onClick={() => setIsOpen(false)} className="rounded-xl min-h-[44px]">
                      <Link to={getRoleDashboard(userRole)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t('nav.dashboard')}
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={() => { handleSignOut(); setIsOpen(false); }} className="text-destructive rounded-xl min-h-[44px]">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('auth.signOut')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="rounded-xl min-h-[44px]">
                      <Link to={ROUTES.LOGIN}>{t('common.signIn')}</Link>
                    </Button>
                    <Button asChild className="rounded-xl min-h-[44px] bg-gradient-premium">
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

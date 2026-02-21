import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Leaf, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DevRoleSwitcher from "@/components/dev/DevRoleSwitcher";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const getRoleDashboard = (role: string | null) => {
    const routes: Record<string, string> = {
      farmer: "/farmer/dashboard",
      buyer: "/marketplace/dashboard",
      agent: "/agent/dashboard",
      logistics: "/logistics/dashboard",
      admin: "/admin/dashboard",
    };
    return routes[role || ""] || "/";
  };

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      farmer: "Farmer",
      buyer: "Buyer",
      agent: "Agent",
      logistics: "Logistics",
      admin: "Admin",
    };
    return labels[role || ""] || "User";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/40 shadow-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16 md:h-[68px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-premium flex items-center justify-center group-hover:scale-105 transition-transform">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-foreground">
              AgriNext <span className="text-primary">Gen</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Home
            </Link>
            <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Marketplace
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              About
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Contact
            </Link>
          </div>

          {/* Auth Buttons */}
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
                    My Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" asChild className="rounded-xl border-border/80 hover:bg-muted/50 font-medium">
                  <Link to="/login">Log In</Link>
                </Button>
                <Button variant="hero" asChild className="rounded-xl font-semibold btn-hover-darken">
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/40 animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/marketplace"
                className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
                onClick={() => setIsOpen(false)}
              >
                Marketplace
              </Link>
              <Link
                to="/about"
                className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors font-medium rounded-lg hover:bg-muted/50"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              <div className="flex flex-col gap-3 px-4 pt-4 border-t border-border/40">
                {user ? (
                  <>
                    <Button variant="outline" asChild onClick={() => setIsOpen(false)} className="rounded-xl min-h-[44px]">
                      <Link to={getRoleDashboard(userRole)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        My Dashboard
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={() => { handleSignOut(); setIsOpen(false); }} className="text-destructive rounded-xl min-h-[44px]">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="rounded-xl min-h-[44px]">
                      <Link to="/login">Log In</Link>
                    </Button>
                    <Button variant="hero" asChild className="rounded-xl min-h-[44px]">
                      <Link to="/signup">Get Started</Link>
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
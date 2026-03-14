import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const Footer = () => {
  const { t } = useLanguage();
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-sidebar text-sidebar-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="py-14 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5 mb-5 group">
                <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-display font-bold">
                    AgriNext <span className="text-sidebar-primary">Gen</span>
                  </span>
                </div>
              </Link>
              <p className="text-sidebar-foreground/60 text-sm leading-relaxed max-w-xs mb-6">
                {t('landing.footer.tagline')}
              </p>
              <div className="flex gap-3">
                {["X", "Li", "Fb"].map((social) => (
                  <div key={social} className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-primary hover:bg-sidebar-accent/80 transition-all cursor-pointer">
                    <span className="text-xs font-bold">{social}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm mb-5 uppercase tracking-wider text-sidebar-foreground/90">
                {t('landing.footer.platformHeading')}
              </h4>
              <ul className="space-y-3 text-sidebar-foreground/60 text-sm">
                <li>
                  <button onClick={() => scrollTo("platform")} className="hover:text-sidebar-primary transition-colors">
                    {t('landing.footer.features')}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo("workflow")} className="hover:text-sidebar-primary transition-colors">
                    {t('landing.footer.howItWorks')}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo("roles")} className="hover:text-sidebar-primary transition-colors">
                    {t('landing.footer.overview')}
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm mb-5 uppercase tracking-wider text-sidebar-foreground/90">
                {t('landing.footer.companyHeading')}
              </h4>
              <ul className="space-y-3 text-sidebar-foreground/60 text-sm">
                <li>
                  <Link to={ROUTES.ABOUT} className="hover:text-sidebar-primary transition-colors">
                    {t('landing.footer.aboutUs')}
                  </Link>
                </li>
                <li>
                  <button onClick={() => scrollTo("impact")} className="hover:text-sidebar-primary transition-colors">
                    {t('landing.footer.ecosystem')}
                  </button>
                </li>
                <li>
                  <Link to={ROUTES.CONTACT} className="hover:text-sidebar-primary transition-colors">
                    {t('landing.footer.contact')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm mb-5 uppercase tracking-wider text-sidebar-foreground/90">
                {t('landing.footer.contactHeading')}
              </h4>
              <ul className="space-y-3.5 text-sidebar-foreground/60 text-sm">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-sidebar-primary" />
                  </div>
                  <a href="mailto:teamAgriNext.Gen@gmail.com" className="hover:text-sidebar-primary transition-colors break-all">
                    teamAgriNext.Gen@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3.5 h-3.5 text-sidebar-primary" />
                  </div>
                  <a href="tel:+919980092461" className="hover:text-sidebar-primary transition-colors">
                    +91 99800 92461
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-sidebar-primary" />
                  </div>
                  <span>Bengaluru, Karnataka, India</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="py-6 border-t border-sidebar-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sidebar-foreground/40 text-sm">
            &copy; {new Date().getFullYear()} {t('landing.footer.copyright')}
          </p>
          <div className="flex items-center gap-6 text-sm text-sidebar-foreground/40">
            <Link to="/privacy" className="hover:text-sidebar-primary transition-colors">{t('landing.footer.privacyPolicy')}</Link>
            <Link to="/terms" className="hover:text-sidebar-primary transition-colors">{t('landing.footer.termsOfService')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

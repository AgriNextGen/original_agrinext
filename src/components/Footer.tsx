import { Link } from "react-router-dom";
import { Leaf, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-sidebar text-sidebar-foreground py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold">
                AgriNext <span className="text-sidebar-primary">Gen</span>
              </span>
            </Link>
            <p className="text-sidebar-foreground/70 text-sm leading-relaxed max-w-xs">
              India's agricultural operating system—connecting farmers, agents, transport, and buyers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sidebar-foreground/70 text-sm">
              <li><Link to="/signup" className="hover:text-sidebar-primary transition-colors">For Farmers</Link></li>
              <li><Link to="/signup" className="hover:text-sidebar-primary transition-colors">For Buyers</Link></li>
              <li><Link to="/signup" className="hover:text-sidebar-primary transition-colors">For Agents</Link></li>
              <li><Link to="/signup" className="hover:text-sidebar-primary transition-colors">For Logistics</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4">Company</h4>
            <ul className="space-y-2.5 text-sidebar-foreground/70 text-sm">
              <li><Link to="/about" className="hover:text-sidebar-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-sidebar-primary transition-colors">Contact</Link></li>
              <li><Link to="/login" className="hover:text-sidebar-primary transition-colors">Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-sidebar-primary transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4">Contact</h4>
            <ul className="space-y-2.5 text-sidebar-foreground/70 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sidebar-primary flex-shrink-0" />
                <a href="mailto:teamAgriNext.Gen@gmail.com" className="hover:text-sidebar-primary transition-colors break-all">
                  teamAgriNext.Gen@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sidebar-primary flex-shrink-0" />
                <a href="tel:+919980092461" className="hover:text-sidebar-primary transition-colors">
                  +91 99800 92461
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sidebar-primary mt-0.5 flex-shrink-0" />
                <span>Bengaluru, Karnataka, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 md:pt-8 border-t border-sidebar-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sidebar-foreground/60 text-sm">
            © 2025 AgriNext Gen. All rights reserved.
          </p>
          <div className="flex items-center gap-4 md:gap-6 text-sm text-sidebar-foreground/60">
            <Link to="/about" className="hover:text-sidebar-primary transition-colors">Privacy Policy</Link>
            <Link to="/about" className="hover:text-sidebar-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  // Body scroll lock when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // ESC key to close sidebar
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium">
        Skip to main content
      </a>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={closeSidebar}
          onTouchEnd={closeSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Desktop Sidebar - always visible on md+ screens */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-30">
        <DashboardSidebar onClose={closeSidebar} isOpen={true} isMobile={false} />
      </div>

      {/* Mobile Sidebar Drawer - only rendered on mobile */}
      <div className="md:hidden">
        <DashboardSidebar onClose={closeSidebar} isOpen={sidebarOpen} isMobile={true} />
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <DashboardHeader title={title} onMenuClick={openSidebar} />
        <main id="main-content" className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

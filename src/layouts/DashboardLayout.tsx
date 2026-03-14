import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import BottomTabBar from '@/components/dashboard/BottomTabBar';
import { useLanguage } from '@/hooks/useLanguage';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const DashboardLayout = ({ children, title = '' }: DashboardLayoutProps) => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

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
        {t('shared.skipToContent')}
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

      {/* Mobile Sidebar Drawer - opened from "More" tab or header menu */}
      <div className="md:hidden">
        <DashboardSidebar onClose={closeSidebar} isOpen={sidebarOpen} isMobile={true} />
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <DashboardHeader title={title} onMenuClick={openSidebar} />
        <main id="main-content" className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar onMoreClick={openSidebar} />
    </div>
  );
};

export default DashboardLayout;

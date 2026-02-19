import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { cn } from '../../lib/utils';
import { NavLink } from 'react-router-dom';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const breakpoint = useBreakpoint();

  const isMobile = breakpoint === 'mobile';
  const effectiveCollapsed = isMobile ? true : sidebarCollapsed;

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div 
      className={cn(
        "h-screen flex flex-col",
        theme === 'dark' ? 'dark' : 'bg-white'
      )}
      style={{ overflow: 'hidden' }}
    >
      {/* TopBar - always fixed at top */}
      <TopBar
        onToggleSidebar={handleToggleSidebar}
        sidebarCollapsed={effectiveCollapsed}
        isMobile={isMobile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      
      {/* Main content area */}
      <div 
        className="flex flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Sidebar */}
        {!isMobile && (
          <Sidebar collapsed={effectiveCollapsed} />
        )}
        
        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNav />
        )}
        
        {/* Main content */}
        <main 
          className={cn(
            "flex-1 overflow-hidden",
            theme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-[#FAFAFA]',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Mobile bottom navigation
function MobileNav() {
  const navItems = [
    { path: '/chat', label: 'Chat', icon: 'Chat' },
    { path: '/persona', label: 'Persona', icon: 'Persona' },
    { path: '/settings', label: 'Settings', icon: 'Settings' },
    { path: '/todos', label: 'Todos', icon: 'Todos' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#242424] border-t border-[#E5E5E5] dark:border-[#333333] z-50 safe-area-pb">
      <ul className="flex justify-around h-14">
        {navItems.map((item) => (
          <li key={item.path} className="flex-1">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center h-full text-xs transition-colors',
                  isActive ? 'text-[#1A1A1A] dark:text-white' : 'text-[#666666] dark:text-[#999999]'
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { Button } from '../ui/Button';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  isMobile?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function TopBar({ onToggleSidebar, sidebarCollapsed, isMobile, theme = 'light', onToggleTheme }: TopBarProps) {
  return (
    <header className="h-[50px] bg-white dark:bg-[#1A1A1A] border-b border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="p-2 h-8 w-8 touch-manipulation"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dark:text-white"
            >
              {sidebarCollapsed ? (
                <path d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path d="M4 6h16M4 12h10M4 18h16" />
              )}
            </svg>
          </Button>
        )}
        <h1 className="text-base font-semibold text-[#1A1A1A] dark:text-white tracking-tight">
          Nanobot
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {onToggleTheme && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className="p-2 h-8 w-8 touch-manipulation"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#1A1A1A]"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}

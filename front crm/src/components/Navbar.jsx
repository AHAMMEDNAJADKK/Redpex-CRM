import { getApiBaseUrl } from '../utils/apiUrl';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import ProfileDrawer from './ProfileDrawer';
import NotificationPopover from './NotificationPopover';
import NavbarNotificationPopup from './NavbarNotificationPopup';
import { AiAnalyzeButton, AiAnalyzeModal } from './AiAnalyzeModal';

const API_BASE = getApiBaseUrl();

const SEARCHABLE_MODULES = [
  { label: 'Admin Dashboard', path: '/dashboard', category: 'Dashboards', desc: 'KPIs, pipeline metrics & real-time analytics' },
  { label: 'Client Leads', path: '/client-leads', category: 'Sales & CRM', desc: 'Manage enterprise sales pipeline & opportunities' },
  { label: 'Clients Directory', path: '/clients', category: 'Sales & CRM', desc: 'Company accounts & client relationships' },
  { label: 'Projects & Deals', path: '/projects', category: 'Sales & CRM', desc: 'Project deliverables, stages & milestones' },
  { label: 'Tasks & Missions', path: '/todo', category: 'Operations', desc: 'Operational tasks, to-dos & assignments' },
  { label: 'Daily Operations OS', path: '/daily-operations', category: 'Operations', desc: 'Shift tracking, attendance & duty logs' },
  { label: 'Staff Attendance', path: '/staff-attendance', category: 'People & HR', desc: 'Real-time check-in, presence & shifts' },
  { label: 'Leave Requests', path: '/leaves', category: 'People & HR', desc: 'Leave applications, balances & approvals' },
  { label: 'Approvals Console', path: '/approvals', category: 'Management', desc: 'Management sign-offs & authorizations' },
  { label: 'Users & Roles', path: '/users', category: 'People & HR', desc: 'Staff directory & access credentials' },
  { label: 'Departments', path: '/departments', category: 'People & HR', desc: 'Enterprise organizational hierarchy' },
  { label: 'Accounts & Finances', path: '/accounts', category: 'Finance', desc: 'Invoices, expenses, ledger & cash books' },
  { label: 'Payslips & Payroll', path: '/payslips', category: 'Finance', desc: 'Monthly payslips & salary distribution' },
  { label: 'Daily Reports', path: '/basic-report', category: 'Reports', desc: 'Daily operational reports & submissions' },
  { label: 'Notifications', path: '/notifications', category: 'System', desc: 'System alerts, task pings & updates' },
  { label: 'System Settings', path: '/settings', category: 'System', desc: 'User profile, preferences & security' }
];


const Navbar = ({ isSidebarCollapsed, toggleMobileSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPageAiOpen, setIsPageAiOpen] = useState(false);
  const [pageContextData, setPageContextData] = useState(null);

  // Pop-up modal state
  const [seenPopupIds, setSeenPopupIds] = useState(new Set());
  const [activePopupNotification, setActivePopupNotification] = useState(null);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = React.useRef(null);

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_MODULES.filter(m => 
      m.label.toLowerCase().includes(q) || 
      m.category.toLowerCase().includes(q) || 
      m.desc.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleSelectSearchResult = (path) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    navigate(path);
  };


  const pathName = location.pathname.substring(1);
  const pageTitle = pathName
    ? pathName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Dashboard';
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // State for scroll visibility tracking (only show on back scrolling)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        return;
      }

      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // State for the logged-in user
  const [currentUser, setCurrentUser] = useState({
    name: 'Guest',
    role: 'User'
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser({
          name: parsedUser.name || 'User',
          role: parsedUser.role?.name || 'Staff'
        });
      } catch (err) {
        console.error("Failed to parse user data", err);
      }
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Content-Type': 'application/json',
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` 
    };
  }, []);

  // Fetch notifications for the current logged in user
  const fetchMyNotifications = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem('token');
      if (!rawToken) return true;

      const res = await fetch(`${API_BASE}/v1/notifications/my-notifications`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return false;

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount || data.data.filter(n => !n.isRead).length);
        }
      }
      return true;
    } catch (err) {
      console.error("Failed to fetch my notifications in Navbar:", err);
      return false;
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let inFlight = false;
    let consecutiveFailures = 0;
    const BASE_INTERVAL_MS = 8000; // Poll every 8s for live notification modal pop-ups
    const MAX_BACKOFF_MS = 2 * 60 * 1000;

    const scheduleNext = (delay) => {
      if (cancelled) return;
      timeoutId = setTimeout(runCheck, delay);
    };

    const runCheck = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      const ok = await fetchMyNotifications();
      inFlight = false;

      if (ok) {
        consecutiveFailures = 0;
        scheduleNext(BASE_INTERVAL_MS);
        return;
      }

      consecutiveFailures += 1;
      scheduleNext(Math.min(BASE_INTERVAL_MS * 2 ** consecutiveFailures, MAX_BACKOFF_MS));
    };

    runCheck();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchMyNotifications]);

  // Handle auto-triggering live pop-up modal ONLY for the single latest unread notification
  const [dismissedPopupIds, setDismissedPopupIds] = useState(new Set());

  const latestUnreadNotification = useMemo(() => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return null;
    return unread.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }, [notifications]);

  useEffect(() => {
    if (latestUnreadNotification) {
      const latestId = latestUnreadNotification._id || latestUnreadNotification.id;
      if (!dismissedPopupIds.has(latestId)) {
        setActivePopupNotification(latestUnreadNotification);
      } else {
        setActivePopupNotification(null);
      }
    } else {
      setActivePopupNotification(null);
    }
  }, [latestUnreadNotification, dismissedPopupIds]);

  const handleClosePopup = () => {
    if (activePopupNotification) {
      const activeId = activePopupNotification._id || activePopupNotification.id;
      setDismissedPopupIds(prev => new Set([...prev, activeId]));
    }
    setActivePopupNotification(null);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  return (
    <>
      <header className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'} left-0`}>
        
        {/* Left Side: Navigation Context, Mobile Hamburger, and Global Quick Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors lg:hidden cursor-pointer"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#be1e2d] shadow-[0_0_6px_rgba(190,30,45,0.6)]" />
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Redpex CRM</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{pageTitle}</span>
          </div>

          {/* Global Quick Search Bar */}
          <div className="hidden md:flex items-center relative ml-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search CRM... (Ctrl+K)"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      handleSelectSearchResult(searchResults[0].path);
                    } else if (searchQuery.trim()) {
                      handleSelectSearchResult(`/client-leads?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }
                }}
                className="pl-8.5 pr-12 py-1.5 w-44 lg:w-60 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 focus:border-[#be1e2d]/60 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs pointer-events-none">
                ⌘K
              </kbd>
            </div>

            {/* Quick Search Dropdown */}
            {isSearchOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSearchOpen(false)} />
                <div className="absolute left-0 top-11 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 mb-1">
                    {searchQuery.trim() ? `Matches for "${searchQuery}"` : 'Quick Jump'}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {(searchQuery.trim() ? searchResults : SEARCHABLE_MODULES.slice(0, 5)).map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleSelectSearchResult(item.path)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#be1e2d] transition-colors truncate">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.desc}
                          </div>
                        </div>
                        <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                          {item.category}
                        </span>
                      </button>
                    ))}
                    {searchQuery.trim() && searchResults.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectSearchResult(`/client-leads?search=${encodeURIComponent(searchQuery.trim())}`)}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-[#be1e2d] text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        Search Client Leads for "{searchQuery}" →
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Section Container */}
        <section className="flex items-center gap-2 relative">

          {/* Universal AI Page Analyzer (Outside of card) */}
          <AiAnalyzeButton
            onClick={() => {
              let pageText = "";
              try {
                const mainEl = document.querySelector('main');
                if (mainEl) {
                  pageText = mainEl.innerText.replace(/\s+/g, ' ').slice(0, 7000);
                }
              } catch (e) {
                console.error("Failed to extract page context for AI", e);
              }
              setPageContextData({
                pageTitle: pageTitle,
                pathname: location.pathname,
                visiblePageSummary: pageText
              });
              setIsPageAiOpen(true);
            }}
            label="AI Analyze Page"
          />

          {/* Right Actions Card (Notification Bell, Theme, Profile) */}
          <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-800/30 p-1 rounded-xl shadow-sm transition-colors relative">

            {/* Bell Icon Notification Trigger */}
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#be1e2d] dark:hover:text-[#be1e2d] hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#be1e2d] rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#be1e2d] dark:hover:text-[#be1e2d] hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative"
              title="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0.95 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </motion.div>
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

            {/* Profile Trigger */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-all group"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              <div className="relative w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs group-hover:border-[#be1e2d] group-hover:text-[#be1e2d] transition-all shadow-sm overflow-hidden">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={15} />}
              </div>
              <div className="hidden xl:flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#be1e2d] transition-colors">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 capitalize mt-0.5">{currentUser.role}</span>
              </div>
            </div>

            {/* Notification Popover Dropdown */}
            <NotificationPopover
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </div>
        </section>

      </header>

      {/* Live Navbar Floating Notification Pop-up Modal */}
      {activePopupNotification && (
        <NavbarNotificationPopup
          notification={activePopupNotification}
          onClose={handleClosePopup}
          onMarkAsRead={handleMarkAsRead}
        />
      )}

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
      />

      {/* Universal Page AI Analyze Modal */}
      <AiAnalyzeModal
        isOpen={isPageAiOpen}
        onClose={() => setIsPageAiOpen(false)}
        contextData={pageContextData}
        title={`AI Analysis: ${pageTitle}`}
      />
    </>
  );
};

export default Navbar;
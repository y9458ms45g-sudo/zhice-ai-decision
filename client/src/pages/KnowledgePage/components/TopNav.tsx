import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Wand2, User, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../ThemeSwitcher';
import UserCenterPanel from '../UserCenterPanel';
import AiSuggestionDialog from '../AiSuggestionDialog';

interface NavSubItem {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  isLink?: boolean;
  subItems?: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'canvas', label: '知识网络', icon: '✨' },
  { id: 'dashboard', label: '仪表盘', icon: '📊', isLink: true },
  {
    id: 'strategy',
    label: '战略',
    icon: '🎯',
    subItems: [
      { id: 'radar', label: '能力雷达' },
      { id: 'goals', label: '3个月目标' },
    ],
  },
  {
    id: 'action',
    label: '行动',
    icon: '🚀',
    subItems: [
      { id: 'tasklist', label: '计划表' },
      { id: 'weekly', label: '本周概览' },
      { id: 'timeline', label: '任务时间线' },
    ],
  },
  { id: 'monetize', label: '变现', icon: '💰' },
];

const SECTION_TO_NAV: Record<string, string> = {
  canvas: 'canvas',
  weekly: 'action',
  strategy: 'strategy',
  radar: 'strategy',
  goals: 'strategy',
  action: 'action',
  tasklist: 'action',
  timeline: 'action',
  monetize: 'monetize',
  profile: 'strategy',
  deep: 'strategy',
  progress: 'action',
};

interface TopNavProps {
  onScrollToSection: (id: string) => void;
}

const TopNav: React.FC<TopNavProps> = ({ onScrollToSection }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<string>('canvas');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [userCenterOpen, setUserCenterOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback(
    (id: string): void => {
      onScrollToSection(id);
    },
    [onScrollToSection],
  );

  const handleNavItemClick = useCallback(
    (item: NavItem): void => {
      if (item.subItems && item.subItems.length > 0) {
        setOpenDropdown((prev: string | null): string | null =>
          prev === item.id ? null : item.id,
        );
      } else {
        scrollToSection(item.id);
        setOpenDropdown(null);
      }
    },
    [scrollToSection],
  );

  const handleSubItemClick = useCallback(
    (parentId: string, subId: string): void => {
      scrollToSection(subId);
      setOpenDropdown(null);
    },
    [scrollToSection],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return (): void => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = (): void => {
      const vh = window.innerHeight;

      const canvasEl = document.getElementById('canvas');
      const canvasTop = canvasEl ? canvasEl.getBoundingClientRect().top : vh;
      if (canvasTop > vh * 0.5) {
        setActiveNav('canvas');
        return;
      }

      const sectionIds = ['canvas', 'weekly', 'strategy', 'action', 'monetize', 'profile', 'progress'];
      let current = 'canvas';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top < 140) {
            current = id;
          }
        }
      }

      const navId = SECTION_TO_NAV[current] ?? current;
      setActiveNav(navId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return (): void => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className="kb-nav" ref={navRef}>
        <div className="kb-nav-logo">
          <svg viewBox="0 0 40 28" aria-hidden="true">
            <use href="#i-bow" />
          </svg>
          智策
        </div>
        <div className="kb-nav-links">
          {NAV_ITEMS.map((item: NavItem): React.ReactNode => (
            <div key={item.id} className={`kb-nav-item ${openDropdown === item.id ? 'kb-open' : ''}`}>
              {item.isLink ? (
                <Link to="/dashboard" className="kb-nav-dashboard-link">
                  <button type="button">
                    <span className="kb-nav-icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </button>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={(): void => handleNavItemClick(item)}
                  className={activeNav === item.id ? 'kb-active' : ''}
                >
                  <span className="kb-nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                  {item.subItems && (
                    <ChevronDown className="kb-nav-chevron" size={14} />
                  )}
                </button>
              )}
              {item.subItems && openDropdown === item.id && !item.isLink && (
                <div className="kb-nav-dropdown">
                  {item.subItems.map((sub: NavSubItem): React.ReactNode => (
                    <button
                      key={sub.id}
                      type="button"
                      className="kb-nav-dropdown-item"
                      onClick={(): void => handleSubItemClick(item.id, sub.id)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="kb-ai-btn"
          onClick={(): void => setAiDialogOpen(true)}
          aria-label="AI 智能建议"
        >
          <Wand2 size={16} strokeWidth={2} />
        </button>
        <ThemeSwitcher />
        <button
          type="button"
          className="kb-user-btn"
          onClick={(): void => setUserCenterOpen(true)}
          aria-label="用户中心"
        >
          <User size={16} strokeWidth={2} />
        </button>
      </nav>

      <UserCenterPanel open={userCenterOpen} onClose={(): void => setUserCenterOpen(false)} />

      <AiSuggestionDialog open={aiDialogOpen} onClose={(): void => setAiDialogOpen(false)} />
    </>
  );
};

export default TopNav;

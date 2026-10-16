import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wand2, Home, Brain, Rocket, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeSwitcher from '../ThemeSwitcher';
import AiSuggestionDialog from '../AiSuggestionDialog';

interface NavItem {
  id: string;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首页', path: '/' },
  { id: 'knowledge', label: '知识网络', path: '/knowledge' },
  { id: 'action', label: '行动', path: '/action' },
  { id: 'profile', label: '我的', path: '/profile' },
];

interface TopNavProps {
  onScrollToSection?: (id: string) => void;
  mode?: 'scroll' | 'navigate';
}

const TopNav: React.FC<TopNavProps> = ({ mode = 'navigate' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const getActiveNav = useCallback((): string => {
    const path = location.pathname;
    if (path.startsWith('/knowledge')) return 'knowledge';
    if (path.startsWith('/action')) return 'action';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/dashboard')) return 'home';
    return 'home';
  }, [location.pathname]);

  const activeNav = getActiveNav();

  const handleNavClick = useCallback(
    (item: NavItem): void => {
      navigate(item.path);
    },
    [navigate],
  );

  const handleLogoClick = useCallback((): void => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/dashboard')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target as Node)) {
        // no-op for now
      }
    };
    document.addEventListener('click', handleClickOutside);
    return (): void => document.removeEventListener('click', handleClickOutside);
  }, []);

  const showAiButton = activeNav === 'home';

  return (
    <>
      <nav className="kb-nav" ref={navRef}>
        <button
          type="button"
          onClick={handleLogoClick}
          className="kb-nav-logo-btn"
          aria-label="返回首页"
        >
          <div className="kb-nav-logo">
            <svg viewBox="0 0 40 28" aria-hidden="true">
              <use href="#i-bow" />
            </svg>
            智策
          </div>
        </button>

        <div className="kb-nav-links">
          {NAV_ITEMS.map((item: NavItem): React.ReactNode => (
            <div key={item.id} className="kb-nav-item">
              <button
                type="button"
                onClick={(): void => handleNavClick(item)}
                className={activeNav === item.id ? 'kb-active' : ''}
              >
                <span className="kb-nav-icon" aria-hidden="true">
                  {item.id === 'home' && <Home size={14} />}
                  {item.id === 'knowledge' && <Brain size={14} />}
                  {item.id === 'action' && <Rocket size={14} />}
                  {item.id === 'profile' && <User size={14} />}
                </span>
                {item.label}
              </button>
            </div>
          ))}
        </div>

        {showAiButton && (
          <button
            type="button"
            className="kb-ai-btn kb-ai-btn-with-label"
            onClick={(): void => setAiDialogOpen(true)}
            aria-label="AI 智能建议"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
            }}
          >
            <Wand2 size={14} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>AI建议</span>
          </button>
        )}

        <ThemeSwitcher />
      </nav>

      <nav className="kb-bottom-nav" aria-label="底部导航">
        {NAV_ITEMS.map((item: NavItem): React.ReactNode => (
          <button
            key={item.id}
            type="button"
            onClick={(): void => handleNavClick(item)}
            className={`kb-bottom-nav-item ${activeNav === item.id ? 'kb-active' : ''}`}
          >
            {item.id === 'home' && <Home size={20} />}
            {item.id === 'knowledge' && <Brain size={20} />}
            {item.id === 'action' && <Rocket size={20} />}
            {item.id === 'profile' && <User size={20} />}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <AiSuggestionDialog open={aiDialogOpen} onClose={(): void => setAiDialogOpen(false)} />
    </>
  );
};

export default TopNav;

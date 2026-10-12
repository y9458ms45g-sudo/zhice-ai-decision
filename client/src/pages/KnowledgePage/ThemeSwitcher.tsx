import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from './ThemeContext';
import type { ThemeName } from './theme';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return (): void => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  const options: { name: ThemeName; label: string; icon: string; desc: string }[] = [
    { name: 'light', label: '粉色奶油', icon: '🌸', desc: '马卡龙果冻风' },
    { name: 'dark', label: '暗夜可爱', icon: '🌙', desc: '暗调黏土可爱风' },
  ];

  return (
    <div className="kb-theme-switcher" ref={wrapRef}>
      <button
        type="button"
        className="kb-theme-btn"
        onClick={(): void => setOpen((v) => !v)}
        aria-label="切换主题"
      >
        <Palette size={16} strokeWidth={2} />
      </button>
      {open && (
        <div className="kb-theme-switcher-panel" role="menu">
          {options.map((opt) => (
            <button
              key={opt.name}
              type="button"
              role="menuitem"
              className={`kb-theme-option ${theme === opt.name ? 'kb-active' : ''}`}
              onClick={(): void => {
                setTheme(opt.name);
                setOpen(false);
              }}
            >
              <span className="kb-theme-option-icon" aria-hidden="true">{opt.icon}</span>
              <span className="kb-theme-option-text">
                <span className="kb-theme-option-title">{opt.label}</span>
                <span className="kb-theme-option-desc">{opt.desc}</span>
              </span>
              {theme === opt.name && <span className="kb-theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;

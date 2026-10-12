import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeKnowledgeChanges } from '@client/src/api/knowledge';
import { isGuestMode } from '@client/src/api/guest-mode';
import { applySseEventToCache, useGraphQuery } from './useKnowledgeData';
import TopNav from './components/TopNav';
import NetworkCanvas from './components/NetworkCanvas';
import InfoPanels from './components/InfoPanels';
import GuestBanner from './components/GuestBanner';
import DecoSvg from '@client/src/components/ui/deco-svg';
import { ThemeProvider } from './ThemeContext';
import './knowledge-coquette.css';

const WELCOME_DECORATIONS = [
  { type: 'spark', left: '8%', top: '18%', size: 32, delay: 0.2, color: 'var(--butter-d)' },
  { type: 'heart', left: '14%', top: '32%', size: 26, delay: 1.5, color: 'var(--blush-d)' },
  { type: 'flower', right: '10%', top: '22%', size: 40, delay: 0.9, color: 'var(--lav)' },
  { type: 'spark', right: '18%', top: '38%', size: 24, delay: 2.3, color: 'var(--powder-d)' },
  { type: 'heart', right: '26%', top: '60%', size: 20, delay: 0.6, color: 'var(--peach-d)' },
  { type: 'flower', left: '24%', top: '72%', size: 26, delay: 2.8, color: 'var(--mint-d)' },
  { type: 'spark', left: '38%', top: '12%', size: 18, delay: 1.8, color: 'var(--blush-d)' },
  { type: 'spark', right: '34%', top: '78%', size: 22, delay: 3.1, color: 'var(--powder-d)' },
];

interface DecoItem {
  type: string;
  left?: string;
  right?: string;
  top: string;
  size: number;
  delay: number;
  color: string;
}

const renderDeco = (
  type: string,
  style: React.CSSProperties,
  className: string = '',
): React.ReactNode => {
  const cls = `kb-deco kb-tw ${className}`;
  const renderSvg = (id: string): React.ReactNode => (
    <svg
      className={cls}
      style={style}
      viewBox={
        id === 'i-spark'
          ? '0 0 24 24'
          : id === 'i-heart'
            ? '0 0 24 24'
            : id === 'i-flower'
              ? '0 0 40 40'
              : id === 'i-cherry'
                ? '0 0 40 40'
                : '0 0 24 24'
      }
      aria-hidden="true"
    >
      <use href={`#${id}`} />
    </svg>
  );

  switch (type) {
    case 'spark':
      return renderSvg('i-spark');
    case 'heart':
      return renderSvg('i-heart');
    case 'flower':
      return renderSvg('i-flower');
    case 'cherry':
      return renderSvg('i-cherry');
    default:
      return null;
  }
};

const KnowledgePage: React.FC = () => {
  const [showBackTop, setShowBackTop] = useState(false);
  const [isGuest] = useState<boolean>(() => isGuestMode());

  const queryClient = useQueryClient();
  const graphQuery = useGraphQuery();
  const loading = graphQuery.isLoading && graphQuery.isFetching;

  useEffect(() => {
    const { close } = subscribeKnowledgeChanges((event): void => {
      applySseEventToCache(queryClient, event);
    });
    return (): void => {
      close();
    };
  }, [queryClient]);

  useEffect(() => {
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    let rafId = 0;
    const vh = window.innerHeight;

    const update = (): void => {
      const scrollY = window.scrollY;
      if (scrollY < vh) {
        const welcomeInner = document.querySelector('.kb-welcome-inner');
        if (welcomeInner instanceof HTMLElement) {
          welcomeInner.style.transform = `translateY(${scrollY * 0.3}px)`;
        }
      }
    };

    const onScroll = (): void => {
      if (rafId) return;
      rafId = requestAnimationFrame((): void => {
        rafId = 0;
        update();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return (): void => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleScrollDown = useCallback((): void => {
    const canvasEl = document.getElementById('canvas');
    if (canvasEl) {
      canvasEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleBackTop = useCallback((): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToSection = useCallback((id: string): void => {
    if (id === 'canvas') {
      const canvasEl = document.getElementById('canvas');
      if (canvasEl) {
        canvasEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const handleScroll = (): void => {
      setShowBackTop(window.scrollY > 480);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return (): void => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center app-bg">
        <div className="text-pink-400 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="kb-page relative w-full overflow-x-hidden">
        <DecoSvg />
        <div className="kb-bg-fixed" />
        <div className="kb-bg-grain" />

        <TopNav onScrollToSection={scrollToSection} />

        <GuestBanner />

        <section className="kb-welcome" id="welcome">
          <div className="kb-welcome-bg" />

          {WELCOME_DECORATIONS.map(
            (d: DecoItem, i: number): React.ReactNode => (
              <React.Fragment key={`w-${i}`}>
                {renderDeco(d.type, {
                  left: d.left,
                  right: d.right,
                  top: d.top,
                  width: d.size,
                  color: d.color || undefined,
                  animationDelay: `${d.delay}s`,
                  ['--rot' as never]: `${(i % 2 === 0 ? 1 : -1) * (8 + i * 3)}deg`,
                }, 'kb-welcome-deco')}
              </React.Fragment>
            ),
          )}

          <svg
            className="kb-deco kb-cat kb-welcome-cat"
            viewBox="0 0 140 124"
            style={{ left: '6%', bottom: '8%', ['--rot' as never]: '-12deg' }}
            aria-hidden="true"
          >
            <use href="#i-cat" />
          </svg>
          <svg
            className="kb-deco kb-cake kb-welcome-cake"
            viewBox="0 0 120 134"
            style={{ right: '6%', bottom: '7%', animationDelay: '-2.4s', ['--rot' as never]: '10deg' }}
            aria-hidden="true"
          >
            <use href="#i-cake" />
          </svg>

          <div className="kb-welcome-inner">
            <div className="kb-welcome-upper">
              <div className="kb-welcome-badge">
                <svg viewBox="0 0 40 28" aria-hidden="true" style={{ width: 16, height: 11 }}>
                  <use href="#i-bow" />
                </svg>
                Hello~ Welcome to my world
              </div>
              <div className="kb-welcome-title-wrap">
                <svg className="kb-welcome-bow kb-left" viewBox="0 0 120 84" aria-hidden="true">
                  <use href="#i-bow" />
                </svg>
                <h1 className="kb-welcome-title">
                  <span className="hl">智策</span>
                </h1>
                <svg className="kb-welcome-bow kb-right" viewBox="0 0 120 84" aria-hidden="true">
                  <use href="#i-bow" />
                </svg>
              </div>
              <div className="kb-welcome-sub">
                个人 AI 决策助手
              </div>
            </div>
            <button
              type="button"
              onClick={handleScrollDown}
              className="kb-welcome-btn kb-jelly kb-pop"
            >
              进入智策
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="kb-lace-edge kb-bottom" />
        </section>

        <NetworkCanvas onScrollDown={handleScrollDown} />

        <InfoPanels />

        <div className="kb-footer">
          <div className="kb-lace-divider" style={{ marginBottom: 26 }}>
            <span className="kb-ld-line" />
            <svg className="kb-ld-icon" viewBox="0 0 120 84" aria-hidden="true">
              <use href="#i-bow" />
            </svg>
            <span className="kb-ld-line" />
          </div>
          <div className="kb-footer-deco">
            <svg className="kb-f-cat" viewBox="0 0 140 124" aria-hidden="true">
              <use href="#i-cat" />
            </svg>
            <svg className="kb-f-cake" viewBox="0 0 120 134" aria-hidden="true">
              <use href="#i-cake" />
            </svg>
          </div>
          <div className="kb-f-title">made with 🍮 &amp; 💕</div>
          <div className="kb-f-sub">
            点点每一颗果冻球，编织属于你的知识星空～
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackTop}
          className={`kb-back-top ${showBackTop ? 'kb-show' : ''}`}
          aria-label="返回顶部"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <use href="#i-paw" />
          </svg>
        </button>
      </div>
    </ThemeProvider>
  );
};

export default KnowledgePage;

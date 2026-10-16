import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Target, CheckSquare, TrendingUp, Star, Calendar } from 'lucide-react';
import { subscribeKnowledgeChanges } from '@client/src/api/knowledge';
import { applySseEventToCache } from '@client/src/pages/KnowledgePage/useKnowledgeData';
import TopNav from '@client/src/pages/KnowledgePage/components/TopNav';
import EditableCard from '@client/src/pages/KnowledgePage/EditableCard';
import ActionTasksByWeek from '@client/src/pages/KnowledgePage/ActionTasksByWeek';
import ProgressCard from '@client/src/pages/KnowledgePage/ProgressCard';
import ActionTasksList from '@client/src/pages/KnowledgePage/ActionTasksList';
import InsightsPanel from '@client/src/pages/KnowledgePage/components/InsightsPanel';
import DecoSvg from '@client/src/components/ui/deco-svg';
import ErrorBoundary from '@client/src/components/ErrorBoundary';
import { ThemeProvider } from '@client/src/pages/KnowledgePage/ThemeContext';
import '@client/src/pages/KnowledgePage/knowledge-coquette.css';

type ActionTabKey = 'strategy' | 'tasks' | 'monetize' | 'insights' | 'all-tasks';

const ACTION_TABS: { key: ActionTabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'strategy', label: '战略规划', icon: <Target size={16} /> },
  { key: 'tasks', label: '任务追踪', icon: <CheckSquare size={16} /> },
  { key: 'monetize', label: '变现方向', icon: <TrendingUp size={16} /> },
  { key: 'insights', label: '收藏观点', icon: <Star size={16} /> },
  { key: 'all-tasks', label: '全部任务', icon: <Calendar size={16} /> },
];

const ActionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActionTabKey>('strategy');
  const [activeTaskTab, setActiveTaskTab] = useState<string>('week');

  useEffect(() => {
    const { close } = subscribeKnowledgeChanges((event): void => {
      applySseEventToCache(queryClient, event);
    });
    return (): void => {
      close();
    };
  }, [queryClient]);

  const handleScrollToSection = (): void => {};

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case 'strategy':
        return (
          <div className="dash-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="dash-section-title">
              <Target size={18} color="#FFC9DE" />
              <span>三阶段成长路线</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <EditableCard
                sectionKey="strategy_phase1"
                title="第1阶段"
                emoji="🌱"
                color="var(--butter)"
                tag="种子期"
              />
              <EditableCard
                sectionKey="strategy_phase2"
                title="第2阶段"
                emoji="🌿"
                color="var(--peach)"
                tag="成长期"
              />
              <EditableCard
                sectionKey="strategy_phase3"
                title="第3阶段"
                emoji="🌳"
                color="var(--mint)"
                tag="绽放期"
              />
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="dash-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="dash-section-title" style={{ marginBottom: 0 }}>
                <CheckSquare size={18} color="#B9E7D4" />
                <span>行动任务</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'week', label: '本周' },
                  { key: 'next', label: '下周' },
                  { key: 'later', label: '以后' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={(): void => setActiveTaskTab(tab.key)}
                    className={`dash-subtab ${activeTaskTab === tab.key ? 'kb-active' : ''}`}
                    style={{ padding: '6px 16px', fontSize: 12 }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <ActionTasksByWeek />
          </div>
        );
      case 'monetize':
        return (
          <div className="dash-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="dash-section-title">
              <TrendingUp size={18} color="#FF9DBB" />
              <span>快速变现方向</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 20,
              }}
            >
              <EditableCard
                sectionKey="monetize_novel"
                title="AIGC小说"
                emoji="📖"
                color="var(--blush-d)"
                tag="AIGC"
              />
              <EditableCard
                sectionKey="monetize_editing"
                title="剪辑接单"
                emoji="🎬"
                color="var(--blush)"
                tag="视频"
              />
              <EditableCard
                sectionKey="monetize_media"
                title="自媒体"
                emoji="📱"
                color="var(--powder)"
                tag="内容"
              />
            </div>
            <div style={{ marginTop: 24 }}>
              <div className="dash-section-title">
                <Star size={18} color="#FFE7A8" />
                <span>90天行动进度</span>
              </div>
              <ProgressCard />
            </div>
          </div>
        );
      case 'insights':
        return <InsightsPanel />;
      case 'all-tasks':
        return (
          <div className="dash-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="dash-section-title">
              <Calendar size={18} color="#DCC9F7" />
              <span>全部任务</span>
            </div>
            <ActionTasksList />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="kb-page relative w-full overflow-x-hidden dash-page">
          <DecoSvg />
          <div className="kb-bg-fixed" />
          <div className="kb-bg-grain" />

          <TopNav onScrollToSection={handleScrollToSection} mode="navigate" />

          <div className="dash-container">
            <div className="dash-header">
              <h1 className="dash-title">行动中心</h1>
              <p className="dash-subtitle">从战略到执行，一步步实现你的目标 🚀</p>
            </div>

            <div className="dash-subtabs">
              {ACTION_TABS.map((tab): React.ReactNode => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={(): void => setActiveTab(tab.key)}
                  className={`dash-subtab ${activeTab === tab.key ? 'kb-active' : ''}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="dash-content-panel">
              {renderContent()}
            </div>

            <div className="dash-footer">
              <div className="kb-lace-divider" style={{ marginBottom: 20 }}>
                <span className="kb-ld-line" />
                <svg className="kb-ld-icon" viewBox="0 0 120 84" aria-hidden="true">
                  <use href="#i-bow" />
                </svg>
                <span className="kb-ld-line" />
              </div>
              <div className="kb-f-title" style={{ fontSize: 13 }}>made with 🍮 &amp; 💕</div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default ActionPage;

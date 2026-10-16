import React from 'react';
import WeeklyStatsCards from '../WeeklyStatsCards';
import ActionTasksByWeek from '../ActionTasksByWeek';
import EditableCard from '../EditableCard';
import ProgressCard from '../ProgressCard';
import InsightsPanel from './InsightsPanel';

const InfoPanels: React.FC = () => {
  return (
    <main className="kb-dashboard-container">
      <div className="kb-dashboard-section" id="weekly">
        <div className="kb-section-title">
          <span className="kb-section-title-icon">📊</span>
          <span className="kb-section-title-text">本周概览</span>
        </div>
        <WeeklyStatsCards />
      </div>

      <div className="kb-dashboard-section grid grid-cols-1 md:grid-cols-2 gap-6">
        <div id="strategy" style={{ scrollMarginTop: 100 }}>
          <div className="kb-section-title" id="strategy-title" style={{ scrollMarginTop: 100 }}>
            <span className="kb-section-title-icon">🎯</span>
            <span className="kb-section-title-text">战略规划</span>
          </div>
          <div className="flex flex-col gap-4" id="goals" style={{ scrollMarginTop: 100 }}>
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

        <div id="action" style={{ scrollMarginTop: 100 }}>
          <div className="kb-section-title" id="timeline" style={{ scrollMarginTop: 100 }}>
            <span className="kb-section-title-icon">🚀</span>
            <span className="kb-section-title-text">行动任务</span>
          </div>
          <div id="tasklist" style={{ scrollMarginTop: 100 }}>
            <ActionTasksByWeek />
          </div>
        </div>
      </div>

      <div className="kb-dashboard-section" id="monetize">
        <div className="kb-section-title">
          <span className="kb-section-title-icon">💰</span>
          <span className="kb-section-title-text">快速变现方向</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
      </div>

      <div className="kb-dashboard-section" id="progress">
        <div className="kb-section-title">
          <span className="kb-section-title-icon">⏳</span>
          <span className="kb-section-title-text">90天行动进度</span>
        </div>
        <ProgressCard />
      </div>

      <div className="kb-dashboard-section" id="insights">
        <InsightsPanel />
      </div>
    </main>
  );
};

export default InfoPanels;

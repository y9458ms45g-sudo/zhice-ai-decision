import React from 'react';
import WeeklyStatsCards from '../WeeklyStatsCards';
import ActionTasksByWeek from '../ActionTasksByWeek';
import EditableCard from '../EditableCard';
import ProgressCard from '../ProgressCard';

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
          <div className="kb-section-title" id="radar" style={{ scrollMarginTop: 100 }}>
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

      <div className="kb-dashboard-section grid grid-cols-1 md:grid-cols-2 gap-6">
        <div id="profile" style={{ scrollMarginTop: 100 }}>
          <div className="kb-section-title">
            <span className="kb-section-title-icon">🌸</span>
            <span className="kb-section-title-text">基础画像</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <EditableCard
              sectionKey="education"
              title="教育背景"
              emoji="🎓"
              color="var(--blush)"
            />
            <EditableCard
              sectionKey="experience"
              title="实践经历"
              emoji="💼"
              color="var(--powder)"
            />
            <EditableCard
              sectionKey="techstack"
              title="技术栈"
              emoji="🛠️"
              color="var(--mint)"
            />
            <EditableCard
              sectionKey="constraints"
              title="关键约束"
              emoji="🎯"
              color="var(--lav)"
            />
          </div>
        </div>

        <div id="deep" style={{ scrollMarginTop: 100 }}>
          <div className="kb-section-title">
            <span className="kb-section-title-icon">🌊</span>
            <span className="kb-section-title-text">深耕领域</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <EditableCard
              sectionKey="deep_backend"
              title="后端开发"
              emoji="⚙️"
              color="var(--mint)"
            />
            <EditableCard
              sectionKey="deep_fullstack"
              title="深度全栈"
              emoji="🧩"
              color="var(--lav)"
            />
            <EditableCard
              sectionKey="deep_ai_pm"
              title="AI产品经理"
              emoji="🤖"
              color="var(--butter)"
            />
            <EditableCard
              sectionKey="deep_frontend"
              title="FED前端"
              emoji="🎨"
              color="var(--peach)"
            />
          </div>
        </div>
      </div>

      <div className="kb-dashboard-section" id="progress">
        <div className="kb-section-title">
          <span className="kb-section-title-icon">⏳</span>
          <span className="kb-section-title-text">90天行动进度</span>
        </div>
        <ProgressCard />
      </div>
    </main>
  );
};

export default InfoPanels;

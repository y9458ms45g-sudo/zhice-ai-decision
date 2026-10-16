import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Network,
  GitBranch,
  Sparkles,
  Activity,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  LayoutDashboard,
  Brain,
} from 'lucide-react';
import { getDashboardStats } from '@client/src/api/knowledge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import TopNav from '../KnowledgePage/components/TopNav';
import { ThemeProvider } from '../KnowledgePage/ThemeContext';
import '../KnowledgePage/knowledge-coquette.css';
import './dashboard.css';

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  if (error) {
    logger.error('仪表盘数据加载失败', error);
  }

  const handleScrollToSection = (): void => {};

  return (
    <ThemeProvider>
      <div
        className="kb-page kb-theme-light"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #FFF6EC 0%, #FFF1F4 50%, #F5F1FF 100%)',
          paddingBottom: 60,
        }}
      >
        <TopNav onScrollToSection={handleScrollToSection} mode="navigate" />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#4A3B52',
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              数据仪表盘
            </h1>
            <p style={{ color: '#9B8AA6', margin: '6px 0 0', fontSize: 14 }}>
              看看你的知识网络和成长进度吧 ✨
            </p>
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#B8A5C4',
              background: 'rgba(255,255,255,0.6)',
              padding: '8px 14px',
              borderRadius: 999,
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,.95)',
              boxShadow: 'var(--sh-1)',
            }}
          >
            最近 7 天趋势
          </div>
        </div>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#B8A5C4' }}>
            加载中...
          </div>
        )}

        {error && (
          <div
            className="kb-jelly"
            style={{
              padding: 24,
              textAlign: 'center',
              color: '#E88BA5',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 24,
            }}
          >
            加载失败，请稍后重试
          </div>
        )}

        {stats && !isLoading && !error && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr',
                gap: 20,
                marginBottom: 20,
              }}
              className="dashboard-grid-top"
            >
              <ProgressRingCard
                value={stats.weeklyProgress}
                label="任务完成率"
                sublabel={`已完成 ${stats.completedTasks} / ${stats.totalTasks} 个任务`}
              />
              <StatCard
                icon={<Network size={22} />}
                gradient="linear-gradient(135deg, #FFC9DE, #FF9DBB)"
                value={stats.totalNodes}
                label="知识节点"
                valueColor="#E87FA3"
              />
              <StatCard
                icon={<GitBranch size={22} />}
                gradient="linear-gradient(135deg, #DCC9F7, #B99CEC)"
                value={stats.totalEdges}
                label="知识连线"
                valueColor="#9E7CD6"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 20,
                marginBottom: 20,
              }}
              className="dashboard-grid-stats"
            >
              <StatCard
                icon={<Sparkles size={20} />}
                gradient="linear-gradient(135deg, #FFE7A8, #FFD36B)"
                value={stats.aiSuggestionsCount}
                label="AI建议次数"
                valueColor="#E8B24A"
                size="small"
              />
              <StatCard
                icon={<Activity size={20} />}
                gradient="linear-gradient(135deg, #B9E7D4, #84D3B6)"
                value={stats.todayActivity}
                label="今日活动"
                valueColor="#5FB896"
                size="small"
              />
              <StatCard
                icon={<ListTodo size={20} />}
                gradient="linear-gradient(135deg, #C7DEFA, #9CC2F0)"
                value={stats.pendingTasks}
                label="待办任务"
                valueColor="#6B96D9"
                size="small"
              />
              <StatCard
                icon={<Clock size={20} />}
                gradient="linear-gradient(135deg, #FFD2B5, #FFAE81)"
                value={stats.inProgressTasks}
                label="进行中"
                valueColor="#E89461"
                size="small"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: 20,
              }}
              className="dashboard-grid-bottom"
            >
              <WeeklyBarChart data={stats.weeklyTaskCounts} />
              <TaskStatusCard stats={stats} />
            </div>
          </>
        )}
        </div>
      </div>
    </ThemeProvider>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  gradient: string;
  value: number;
  label: string;
  valueColor: string;
  size?: 'normal' | 'small';
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  gradient,
  value,
  label,
  valueColor,
  size = 'normal',
}) => {
  const iconSize = size === 'small' ? 36 : 44;
  const valueSize = size === 'small' ? 28 : 36;
  const padding = size === 'small' ? '18px 20px' : '22px 24px';
  const minHeight = size === 'small' ? 100 : 140;

  return (
    <div
      className="kb-jelly"
      style={{
        padding,
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        border: '1.5px solid rgba(255, 255, 255, .95)',
        boxShadow: 'var(--sh-1), var(--jelly-in)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight,
      }}
    >
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: 14,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow:
            'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(196, 146, 166, .2)',
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: valueSize,
            fontWeight: 700,
            color: valueColor,
            lineHeight: 1.1,
            letterSpacing: -1,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 13, color: '#9B8AA6', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
};

interface ProgressRingCardProps {
  value: number;
  label: string;
  sublabel: string;
}

const ProgressRingCard: React.FC<ProgressRingCardProps> = ({
  value,
  label,
  sublabel,
}) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className="kb-jelly"
      style={{
        padding: '24px 28px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        border: '1.5px solid rgba(255, 255, 255, .95)',
        boxShadow: 'var(--sh-1), var(--jelly-in)',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#FFE6F0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC9DE" />
              <stop offset="100%" stopColor="#FF9DBB" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#E87FA3',
              lineHeight: 1,
            }}
          >
            {value}%
          </div>
          <div style={{ fontSize: 11, color: '#B8A5C4', marginTop: 2 }}>完成率</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#4A3B52',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <TrendingUp size={18} color="#84D3B6" />
          {label}
        </div>
        <div style={{ fontSize: 13, color: '#9B8AA6', lineHeight: 1.6 }}>
          {sublabel}
        </div>
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background:
              'linear-gradient(135deg, rgba(255,201,222,0.3), rgba(220,201,247,0.3))',
            borderRadius: 14,
            fontSize: 12,
            color: '#7D6B8A',
          }}
        >
          继续加油哦，每天进步一点点 🎀
        </div>
      </div>
    </div>
  );
};

interface WeeklyBarChartProps {
  data: { date: string; count: number }[];
}

const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div
      className="kb-jelly"
      style={{
        padding: '22px 24px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        border: '1.5px solid rgba(255, 255, 255, .95)',
        boxShadow: 'var(--sh-1), var(--jelly-in)',
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#4A3B52',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Brain size={18} color="#B99CEC" />
        近 7 天完成任务
      </div>
      <div style={{ fontSize: 12, color: '#9B8AA6', marginBottom: 20 }}>
        每天完成的任务数量
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: 160,
          gap: 12,
          padding: '0 8px',
        }}
      >
        {data.map((item, index) => {
          const heightPercent = (item.count / maxCount) * 100;
          const dayIndex = new Date(item.date).getDay();
          return (
            <div
              key={item.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#E87FA3',
                  opacity: item.count > 0 ? 1 : 0.4,
                }}
              >
                {item.count}
              </div>
              <div
                style={{
                  width: '100%',
                  maxWidth: 36,
                  height: `${heightPercent}%`,
                  minHeight: item.count > 0 ? 8 : 4,
                  background:
                    'linear-gradient(180deg, #FFC9DE 0%, #FF9DBB 100%)',
                  borderRadius: '10px 10px 6px 6px',
                  boxShadow:
                    'inset 0 2px 3px rgba(255,255,255,0.6), 0 2px 8px rgba(255,157,187,0.35)',
                  transition: 'height 0.6s ease',
                }}
              />
              <div style={{ fontSize: 12, color: '#9B8AA6' }}>
                {dayLabels[dayIndex]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TaskStatusCardProps {
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
  };
}

const TaskStatusCard: React.FC<TaskStatusCardProps> = ({ stats }) => {
  const items = [
    {
      label: '已完成',
      value: stats.completedTasks,
      icon: <CheckCircle2 size={18} />,
      color: '#84D3B6',
      bg: 'rgba(185, 231, 212, 0.35)',
    },
    {
      label: '进行中',
      value: stats.inProgressTasks,
      icon: <Clock size={18} />,
      color: '#FFAE81',
      bg: 'rgba(255, 210, 181, 0.35)',
    },
    {
      label: '待办',
      value: stats.pendingTasks,
      icon: <ListTodo size={18} />,
      color: '#9CC2F0',
      bg: 'rgba(199, 222, 250, 0.35)',
    },
  ];

  return (
    <div
      className="kb-jelly"
      style={{
        padding: '22px 24px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        border: '1.5px solid rgba(255, 255, 255, .95)',
        boxShadow: 'var(--sh-1), var(--jelly-in)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#4A3B52',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <LayoutDashboard size={18} color="#E87FA3" />
        任务状态分布
      </div>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: item.bg,
            borderRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: item.color,
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              {item.icon}
            </div>
            <span style={{ fontSize: 13, color: '#4A3B52', fontWeight: 500 }}>
              {item.label}
            </span>
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: item.color,
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px dashed rgba(155,138,166,0.2)',
          fontSize: 12,
          color: '#9B8AA6',
          textAlign: 'center',
        }}
      >
        共 <strong style={{ color: '#7D6B8A' }}>{stats.totalTasks}</strong> 个任务
      </div>
    </div>
  );
};

export default DashboardPage;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  CalendarDays,
  CheckCircle2,
  Flame,
  Sparkles,
  Clock,
  TrendingUp,
  ListTodo,
  FileEdit,
  Brain,
  Star,
  Zap,
} from 'lucide-react';
import {
  getDashboardStats,
  getActivityLogs,
  subscribeKnowledgeChanges,
} from '@client/src/api/knowledge';
import TopNav from '../KnowledgePage/components/TopNav';
import DecoSvg from '@client/src/components/ui/deco-svg';
import ErrorBoundary from '@client/src/components/ErrorBoundary';
import { ThemeProvider } from '../KnowledgePage/ThemeContext';
import type { DashboardStats, ActivityLog } from '@shared/api.interface';
import '../KnowledgePage/knowledge-coquette.css';

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const TASK_TYPE_META = {
  learning: { label: '学习成长', color: '#FF9DBB' },
  job_hunting: { label: '求职投递', color: '#DCC9F7' },
  money_making: { label: '变现行动', color: '#FFD480' },
} as const;

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: activityData } = useQuery<{ items: ActivityLog[]; total: number }>({
    queryKey: ['activity-logs', 10],
    queryFn: (): Promise<{ items: ActivityLog[]; total: number }> =>
      getActivityLogs(10),
  });

  useEffect(() => {
    const { close } = subscribeKnowledgeChanges((): void => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
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

  const trendOption: EChartsOption = useMemo(() => {
    const data = stats?.weeklyTaskCounts ?? [];
    const labels = data.map((d): string => {
      const dayIdx = new Date(d.date).getDay();
      return WEEKDAY_LABELS[dayIdx];
    });
    const values = data.map((d): number => d.count);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#E8D8E8' } },
        axisLabel: { color: '#9B8AA6' },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#F3E8F0', type: 'dashed' } },
        axisLabel: { color: '#9B8AA6' },
      },
      series: [
        {
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#FF9DBB', width: 3 },
          itemStyle: { color: '#FF9DBB' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,157,187,0.35)' },
                { offset: 1, color: 'rgba(255,201,222,0.05)' },
              ],
            },
          },
        },
      ],
    };
  }, [stats?.weeklyTaskCounts]);

  const pieOption: EChartsOption = useMemo(() => {
    const dist = stats?.taskTypeDistribution;
    if (!dist) {
      return {
        tooltip: { trigger: 'item' },
        legend: { type: 'scroll', bottom: 0 },
        series: [{ type: 'pie', radius: ['55%', '75%'], data: [], label: { show: false }, emphasis: { label: { show: false } } }],
      };
    }
    const entries = (Object.keys(dist) as Array<keyof typeof dist>)
      .filter((k): boolean => dist[k] > 0)
      .map((k) => ({
        name: TASK_TYPE_META[k].label,
        value: dist[k],
        itemStyle: { color: TASK_TYPE_META[k].color },
      }));
    return {
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0, icon: 'circle' },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['50%', '42%'],
          data: entries,
          label: { show: false },
          emphasis: { label: { show: false } },
        },
      ],
    };
  }, [stats?.taskTypeDistribution]);

  const kpiCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        icon: <CalendarDays size={20} color="white" />,
        label: '本周完成任务',
        value: stats.weekCompletedTasks ?? stats.completedTasks,
        unit: '项',
        delta: stats.weekOverWeekChange,
        color: 'linear-gradient(135deg, #FFC9DE, #FF9DBB)',
        subColor: '#FF9DBB',
      },
      {
        icon: <CheckCircle2 size={20} color="white" />,
        label: '累计完成任务',
        value: stats.completedTasks,
        unit: '项',
        delta: null,
        color: 'linear-gradient(135deg, #B9E7D4, #8DD4BE)',
        subColor: '#5FA89C',
      },
      {
        icon: <Flame size={20} color="white" />,
        label: '连续坚持',
        value: stats.streakDays,
        unit: '天',
        delta: null,
        color: 'linear-gradient(135deg, #FFD4B8, #FFB898)',
        subColor: '#E8956B',
      },
      {
        icon: <Sparkles size={20} color="white" />,
        label: '上次AI建议',
        value: stats.lastAiSuggestionAt
          ? formatTimeAgo(stats.lastAiSuggestionAt)
          : '暂无',
        unit: '',
        delta: null,
        color: 'linear-gradient(135deg, #DCC9F7, #B8A5E5)',
        subColor: '#9B7FC4',
      },
    ];
  }, [stats]);

  const activityIconMap: Record<string, React.ReactNode> = {
    task_create: <ListTodo size={14} color="#FF9DBB" />,
    task_done: <CheckCircle2 size={14} color="#B9E7D4" />,
    card_update: <FileEdit size={14} color="#DCC9F7" />,
    node_create: <Brain size={14} color="#FFD480" />,
    ai_suggestion: <Sparkles size={14} color="#B8E8E0" />,
  };

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="kb-page relative w-full overflow-x-hidden dash-page">
          <DecoSvg />
          <div className="kb-bg-fixed" />
          <div className="kb-bg-grain" />

          <TopNav mode="navigate" />

          <div className="dash-container">
            <div className="dash-header">
              <div>
                <h1 className="dash-title">数据概览</h1>
                <p className="dash-subtitle">你的成长进度，一目了然 ✨</p>
              </div>
            </div>

            <div className="dash-grid dash-stats-grid">
              {isLoading
                ? [0, 1, 2, 3].map((i: number): React.ReactNode => (
                    <div key={i} className="dash-card kb-jelly dash-stat-card dash-loading" />
                  ))
                : error
                  ? (
                    <div className="dash-card kb-jelly" style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#B8A5C4' }}>
                      数据加载失败
                    </div>
                  )
                  : kpiCards.map((card, idx: number): React.ReactNode => (
                      <div key={idx} className="dash-card kb-jelly dash-stat-card dash-kpi-card">
                        <div className="dash-stat-icon" style={{ background: card.color }}>
                          {card.icon}
                        </div>
                        <div className="dash-stat-label">{card.label}</div>
                        <div className="dash-stat-value">
                          {card.value}
                          <span className="dash-stat-unit">{card.unit}</span>
                        </div>
                        {card.delta !== null && (
                          <div className="dash-stat-sub" style={{ color: card.subColor }}>
                            <TrendingUp size={12} />
                            <span>较上周 {card.delta >= 0 ? '+' : ''}{card.delta}%</span>
                          </div>
                        )}
                      </div>
                    ))}
            </div>

            <div className="dash-charts-row">
              <div className="dash-card kb-jelly dash-chart-card">
                <div className="dash-chart-title">
                  <Zap size={16} color="#FF9DBB" />
                  <span>近7天完成趋势</span>
                </div>
                <ReactECharts
                  option={trendOption}
                  className="h-[260px]"
                  style={{ height: 260 }}
                />
              </div>
              <div className="dash-card kb-jelly dash-chart-card">
                <div className="dash-chart-title">
                  <Star size={16} color="#FFD480" />
                  <span>任务分类分布</span>
                </div>
                {stats && (stats.taskTypeDistribution.learning + stats.taskTypeDistribution.job_hunting + stats.taskTypeDistribution.money_making) === 0 ? (
                  <div className="dash-empty">
                    <Star size={32} color="#E8D8E8" />
                    <p>暂无任务数据</p>
                  </div>
                ) : (
                  <ReactECharts
                    option={pieOption}
                    className="h-[260px]"
                    style={{ height: 260 }}
                  />
                )}
              </div>
            </div>

            <div className="dash-section">
              <div className="dash-section-title">
                <Clock size={18} color="#B8A5E5" />
                <span>最近活动</span>
              </div>
              <div className="dash-card kb-jelly dash-timeline-card">
                {!activityData || activityData.items.length === 0 ? (
                  <div className="dash-empty">
                    <Clock size={32} color="#E8D8E8" />
                    <p>暂无活动记录</p>
                  </div>
                ) : (
                  <ul className="dash-timeline">
                    {activityData.items.slice(0, 10).map((item: ActivityLog): React.ReactNode => (
                      <li key={item.id} className="dash-timeline-item">
                        <div className="dash-timeline-dot">
                          {activityIconMap[item.actionType] ?? <Zap size={14} color="#DCC9F7" />}
                        </div>
                        <div className="dash-timeline-content">
                          <div className="dash-timeline-text">{item.content}</div>
                          <div className="dash-timeline-time">{formatTimeAgo(item.createdAt)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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

export default HomePage;

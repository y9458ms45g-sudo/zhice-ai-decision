import React, { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, Info, Settings, User, Check, BarChart2, Clock, Flame, Calendar, Sparkles, ChevronDown, Home, RotateCcw, LogOut } from 'lucide-react';
import { useTheme } from '@client/src/pages/KnowledgePage/ThemeContext';
import type { ThemeName } from '@client/src/pages/KnowledgePage/theme';
import { knowledgeApi, authApi } from '@client/src/api';
import { isGuestMode } from '@client/src/api/guest-mode';
import { useCardsQuery, useActionTasksQuery, useGraphQuery, useResetGraphMutation } from '@client/src/pages/KnowledgePage/useKnowledgeData';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import TopNav from '@client/src/pages/KnowledgePage/components/TopNav';
import DecoSvg from '@client/src/components/ui/deco-svg';
import ErrorBoundary from '@client/src/components/ErrorBoundary';
import { ThemeProvider } from '@client/src/pages/KnowledgePage/ThemeContext';
import type { ActivityLog, UserStatsResponse, OperationHistoryItem } from '@shared/api.interface';
import '@client/src/pages/KnowledgePage/knowledge-coquette.css';

const THEME_OPTIONS: { name: ThemeName; label: string; icon: string }[] = [
  { name: 'light', label: '粉色奶油', icon: '🌸' },
  { name: 'dark', label: '暗夜可爱', icon: '🌙' },
];

const DEFAULT_VIEW_OPTIONS = [
  { value: 'canvas', label: '知识网络', icon: '✨' },
  { value: 'tasks', label: '计划表', icon: '📋' },
];

const ACTION_LABELS: Record<string, string> = {
  add_task: '添加任务',
  complete_task: '完成任务',
  edit_card: '编辑卡片',
  add_node: '添加节点',
  ai_suggestion: 'AI建议',
  delete_node: '删除节点',
  edit_node: '编辑节点',
  add_edge: '添加连线',
};

function getActionLabel(type: string): string {
  return ACTION_LABELS[type] ?? type;
}

const HISTORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  card_edit: { icon: '✏️', color: '#4A90D9', bg: 'linear-gradient(135deg, #C7DEFA, #E8F1FF)' },
  task_complete: { icon: '✅', color: '#56B98A', bg: 'linear-gradient(135deg, #B9E7D4, #D8F5E6)' },
  task_create: { icon: '📝', color: '#F2994A', bg: 'linear-gradient(135deg, #FFD4B8, #FFE7C9)' },
  task_status_change: { icon: '🔄', color: '#F2994A', bg: 'linear-gradient(135deg, #FFD4B8, #FFE7C9)' },
  task_delete: { icon: '🗑️', color: '#999', bg: 'linear-gradient(135deg, #E8E8E8, #F5F5F5)' },
  ai_suggestion: { icon: '🤖', color: '#9B6BD9', bg: 'linear-gradient(135deg, #DCC9F7, #EDE4FF)' },
  theme_change: { icon: '🎨', color: '#E879A6', bg: 'linear-gradient(135deg, #FFC9DE, #FFE1EC)' },
  node_edit: { icon: '🔗', color: '#56B9B0', bg: 'linear-gradient(135deg, #B8E8E0, #D8F5F0)' },
};

function getHistoryMeta(type: string) {
  return HISTORY_META[type] ?? { icon: '📌', color: '#999', bg: 'linear-gradient(135deg, #E8E8E8, #F5F5F5)' };
}

const SUGGESTION_ICONS = ['💡', '🎯', '🚀'];

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

const ProfilePage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const cardsQuery = useCardsQuery();
  const tasksQuery = useActionTasksQuery();
  const graphQuery = useGraphQuery();
  const user = authApi.getUser();

  const [defaultView, setDefaultView] = useState<string>(() => {
    try {
      return localStorage.getItem('kb-default-view') || 'canvas';
    } catch {
      return 'canvas';
    }
  });
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kb-notify') !== 'false';
    } catch {
      return true;
    }
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [historyItems, setHistoryItems] = useState<OperationHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const handleScrollToSection = (): void => {};

  useEffect(() => {
    try {
      localStorage.setItem('kb-default-view', defaultView);
    } catch {
      // noop
    }
  }, [defaultView]);

  useEffect(() => {
    try {
      localStorage.setItem('kb-notify', String(notifyEnabled));
    } catch {
      // noop
    }
  }, [notifyEnabled]);

  useEffect(() => {
    setSyncStatus('syncing');
    const timer = setTimeout(() => setSyncStatus('synced'), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLogsLoading(true);
      try {
        const [statsRes, logsRes] = await Promise.all([
          knowledgeApi.getUserStats(),
          knowledgeApi.getActivityLogs(showAllLogs ? 50 : 20),
        ]);
        if (cancelled) return;
        setStats(statsRes);
        setActivityLogs(logsRes.items);
        setLogsTotal(logsRes.total);
      } catch (error) {
        logger.error('加载用户数据失败', error);
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAllLogs]);

  const loadHistory = useCallback(async (offset: number, append = false) => {
    setHistoryLoading(true);
    try {
      const res = await knowledgeApi.getOperationHistory(20, offset);
      setHistoryTotal(res.total);
      setHasMoreHistory(offset + res.items.length < res.total);
      setHistoryItems((prev) => (append ? [...prev, ...res.items] : res.items));
      setHistoryOffset(offset + res.items.length);
    } catch (error) {
      logger.error('加载历史记录失败', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && historyItems.length === 0) {
      void loadHistory(0, false);
    }
  }, [activeTab, historyItems.length, loadHistory]);

  const handleExport = useCallback(async () => {
    try {
      const [graph, cards, tasks] = await Promise.all([
        knowledgeApi.getGraph(),
        knowledgeApi.getCards(),
        knowledgeApi.getActionTasks(),
      ]);
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        graph,
        cards,
        tasks,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `智策数据备份_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('导出数据失败', error);
    }
  }, []);

  const handleClearTasks = useCallback(async () => {
    setClearing(true);
    try {
      const tasks = tasksQuery.data ?? [];
      const toDelete = tasks.filter((t) => t.status === 'done');
      await Promise.all(
        toDelete.map((t) => knowledgeApi.deleteActionTask(t.id)),
      );
      void queryClient.invalidateQueries({ queryKey: ['actionTasks'] });
      void queryClient.invalidateQueries({ queryKey: ['actionTasksOverview'] });
      setClearConfirm(false);
    } catch (error) {
      logger.error('清除已完成任务失败', error);
    } finally {
      setClearing(false);
    }
  }, [queryClient, tasksQuery.data]);

  const resetGraphMutation = useResetGraphMutation();

  const handleResetGraph = useCallback(async () => {
    try {
      await resetGraphMutation.mutateAsync();
      setResetConfirm(false);
      toast.success('已重置知识图谱');
    } catch (error) {
      logger.error('重置知识图谱失败', error);
      toast.error('重置失败，请重试');
    }
  }, [resetGraphMutation]);

  const handleLogout = useCallback(() => {
    if (isGuestMode()) {
      navigate('/login');
      return;
    }
    authApi.clearAuth();
    toast.success('已退出登录');
    navigate('/login');
  }, [navigate]);

  const TAB_ITEMS = [
    { key: 'home', label: '概览', icon: Home },
    { key: 'history', label: '历史记录', icon: Clock },
    { key: 'settings', label: '设置', icon: Settings },
    { key: 'data', label: '数据管理', icon: Download },
    { key: 'about', label: '关于', icon: Info },
  ];

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
              <h1 className="dash-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>👤</span>
                个人中心
              </h1>
              <p className="dash-subtitle">
                管理你的账号、设置和数据 🌸
              </p>
            </div>

            <div className="dash-profile-layout">
              <nav className="dash-profile-sidebar">

                {TAB_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={`dash-sidebar-item ${activeTab === item.key ? 'kb-active' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <div style={{ height: 1, background: 'rgba(255, 200, 220, 0.4)', margin: '8px 8px' }} />

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    width: '100%',
                    textAlign: 'left',
                    color: '#E88BA5',
                    background: 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <LogOut size={18} />
                  <span>{isGuestMode() ? '去登录' : '退出登录'}</span>
                </button>
              </nav>

              <div className="dash-profile-content">
                {activeTab === 'home' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div
                      className="kb-card kb-jelly kb-uc-profile-card dash-card"
                      style={{
                        padding: 32,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                        textAlign: 'center',
                        borderRadius: 28,
                      }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #FFC9DE, #FFB8C9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 40,
                          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 16px rgba(255, 157, 187, 0.3)',
                        }}
                      >
                        🐱
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#4A3B52' }}>
                        {user?.nickname || (isGuestMode() ? '游客用户' : '未命名用户')}
                      </div>
                      <div style={{ fontSize: 13, color: '#9B8AA6' }}>
                        {user?.email || (isGuestMode() ? '游客模式' : '未登录')}
                      </div>
                    </div>

                    <div className="dash-card kb-jelly">
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#4A3B52',
                          marginBottom: 18,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <BarChart2 size={18} color="#FF9DBB" />
                        数据看板
                      </div>
                        <div className="dash-grid dash-stats-grid" style={{ marginBottom: 0 }}>
                        <div
                          style={{
                            background: 'rgba(255,231,168,0.3)',
                            borderRadius: 16,
                            padding: '16px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#E8B24A' }}>
                            {stats?.weekCompletedTasks ?? 0}
                          </div>
                          <div style={{ fontSize: 12, color: '#9B8AA6', marginTop: 4 }}>本周完成</div>
                        </div>
                        <div
                          style={{
                            background: 'rgba(185,231,212,0.3)',
                            borderRadius: 16,
                            padding: '16px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#5FB896' }}>
                            {stats?.totalCompletedTasks ?? 0}
                          </div>
                          <div style={{ fontSize: 12, color: '#9B8AA6', marginTop: 4 }}>累计完成</div>
                        </div>
                        <div
                          style={{
                            background: 'rgba(255,201,222,0.3)',
                            borderRadius: 16,
                            padding: '16px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#E87FA3' }}>
                            {stats?.streakDays ?? 0}
                          </div>
                          <div style={{ fontSize: 12, color: '#9B8AA6', marginTop: 4 }}>连续天数</div>
                        </div>
                        <div
                          style={{
                            background: 'rgba(220,201,247,0.3)',
                            borderRadius: 16,
                            padding: '16px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#9E7CD6', lineHeight: 1.3 }}>
                            {stats?.lastAiSuggestionAt
                              ? new Date(stats.lastAiSuggestionAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                              : '—'}
                          </div>
                          <div style={{ fontSize: 12, color: '#9B8AA6', marginTop: 4 }}>上次AI建议</div>
                        </div>
                      </div>
                    </div>

                    <div className="dash-card kb-jelly">
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#4A3B52',
                          marginBottom: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Clock size={18} color="#B99CEC" />
                          最近活动
                        </div>
                        <span style={{ fontSize: 12, color: '#B8A5C4' }}>共{logsTotal}条</span>
                      </div>
                      {logsLoading ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#B8A5C4' }}>加载中...</div>
                      ) : activityLogs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#B8A5C4', fontSize: 13 }}>
                          暂无操作记录
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {activityLogs.slice(0, 5).map((log) => {
                            const hasUndefined = !log.content || log.content.includes('undefined');
                            const displayContent = hasUndefined
                              ? log.actionType === 'complete_task'
                                ? '完成了某项任务'
                                : log.actionType === 'add_task'
                                  ? '添加了某项任务'
                                  : getActionLabel(log.actionType)
                              : log.content;
                            return (
                              <div
                                key={log.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 14px',
                                  background: 'rgba(255,255,255,0.5)',
                                  borderRadius: 14,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: 'rgba(255,201,222,0.4)',
                                    color: '#E87FA3',
                                    fontWeight: 500,
                                    flexShrink: 0,
                                  }}
                                >
                                  {getActionLabel(log.actionType)}
                                </span>
                                <span style={{ fontSize: 13, color: '#5A4B65', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {displayContent}
                                </span>
                                <span style={{ fontSize: 11, color: '#B8A5C4', flexShrink: 0 }}>
                                  {formatTime(log.createdAt)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="dash-card kb-jelly">
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#4A3B52' }}>操作历史</span>
                      <span style={{ fontSize: 12, color: '#B8A5C4' }}>共{historyTotal}条</span>
                    </div>
                    {historyLoading && historyItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#B8A5C4' }}>加载中...</div>
                    ) : historyItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#B8A5C4' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                        暂无操作记录
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {historyItems.map((item) => {
                          const meta = getHistoryMeta(item.actionType);
                          const isExpandable = item.actionType === 'ai_suggestion' && item.detail?.fullText;
                          const isExpanded = expandedHistoryId === item.id;
                          const suggestions = (item.detail?.suggestions as Array<{ title: string; content: string }> | undefined) ?? [];
                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                gap: 12,
                                padding: '12px 0',
                                borderBottom: '1px solid rgba(255, 200, 220, 0.2)',
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 12,
                                  background: meta.bg,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 16,
                                  flexShrink: 0,
                                }}
                              >
                                {meta.icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {isExpandable ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedHistoryId((v) => (v === item.id ? null : item.id))}
                                    style={{
                                      width: '100%',
                                      textAlign: 'left',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 0,
                                    }}
                                  >
                                    <div style={{ fontSize: 13, color: '#5A4B65', fontWeight: 500 }}>
                                      {item.description}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#B8A5C4', marginTop: 4 }}>
                                      {formatTime(item.createdAt)}
                                      <ChevronDown size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                                    </div>
                                  </button>
                                ) : (
                                  <>
                                    <div style={{ fontSize: 13, color: '#5A4B65' }}>{item.description}</div>
                                    <div style={{ fontSize: 11, color: '#B8A5C4', marginTop: 4 }}>
                                      {formatTime(item.createdAt)}
                                    </div>
                                  </>
                                )}
                                {isExpandable && isExpanded && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      padding: 12,
                                      background: 'rgba(255,240,250,0.6)',
                                      borderRadius: 12,
                                      fontSize: 12,
                                      color: '#7A6B85',
                                    }}
                                  >
                                    {suggestions.length > 0 ? (
                                      suggestions.map((s, i) => (
                                        <div key={i} style={{ marginBottom: 8 }}>
                                          <div style={{ fontWeight: 600, color: '#E87FA3' }}>
                                            {SUGGESTION_ICONS[i % SUGGESTION_ICONS.length]} {s.title}
                                          </div>
                                          <div style={{ marginTop: 2 }}>{s.content}</div>
                                        </div>
                                      ))
                                    ) : (
                                      <div>{String(item.detail?.fullText ?? '')}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {hasMoreHistory && (
                      <button
                        type="button"
                        onClick={() => loadHistory(historyOffset, true)}
                        disabled={historyLoading}
                        style={{
                          width: '100%',
                          marginTop: 16,
                          padding: '10px 0',
                          borderRadius: 12,
                          border: 'none',
                          background: 'rgba(255,201,222,0.2)',
                          color: '#E87FA3',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {historyLoading ? '加载中...' : '加载更多'}
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="dash-card kb-jelly">
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#4A3B52', marginBottom: 20 }}>
                      设置
                    </div>

                    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,200,220,0.2)' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#5A4B65', marginBottom: 12 }}>
                        主题选择
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {THEME_OPTIONS.map((opt) => (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() => setTheme(opt.name)}
                            style={{
                              flex: 1,
                              padding: '16px',
                              borderRadius: 16,
                              border: theme === opt.name
                                ? '2px solid #FF9DBB'
                                : '1.5px solid rgba(255,255,255,.95)',
                              background: 'rgba(255,255,255,0.5)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span style={{ fontSize: 28 }}>{opt.icon}</span>
                            <span style={{ fontSize: 13, color: '#5A4B65', fontWeight: 500 }}>
                              {opt.label}
                            </span>
                            {theme === opt.name && (
                              <Check size={14} color="#FF9DBB" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#5A4B65' }}>任务到期提醒</div>
                        <div style={{ fontSize: 12, color: '#9B8AA6', marginTop: 2 }}>开启后将在任务到期时提醒你</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifyEnabled((v) => !v)}
                        aria-pressed={notifyEnabled}
                        aria-label="任务到期提醒开关"
                        style={{
                          width: 44,
                          height: 24,
                          borderRadius: 999,
                          border: 'none',
                          cursor: 'pointer',
                          background: notifyEnabled
                            ? 'linear-gradient(135deg, #FFC9DE, #FF9DBB)'
                            : '#E5D9EC',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: notifyEnabled ? 22 : 2,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="dash-card kb-jelly">
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#4A3B52', marginBottom: 20 }}>
                      数据管理
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #B9E7D4, #84D3B6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                          }}
                        >
                          {syncStatus === 'synced' ? <Check size={18} /> : <RotateCcw size={18} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#5A4B65' }}>云同步状态</div>
                          <div style={{ fontSize: 12, color: '#9B8AA6' }}>
                            {syncStatus === 'synced' ? '数据已同步到云端' : '同步中...'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 1, background: 'rgba(255,200,220,0.2)', margin: '12px 0' }} />

                    <button
                      type="button"
                      onClick={handleExport}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 16,
                        border: 'none',
                        background: 'rgba(199,222,250,0.3)',
                        cursor: 'pointer',
                        color: '#6B96D9',
                        fontWeight: 500,
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      <Download size={18} />
                      <span>导出数据（JSON）</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClearConfirm(true)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 16,
                        border: 'none',
                        background: 'rgba(255,231,168,0.3)',
                        cursor: 'pointer',
                        color: '#E8B24A',
                        fontWeight: 500,
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      <Check size={18} />
                      <span>清除已完成任务</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetConfirm(true)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 16,
                        border: 'none',
                        background: 'rgba(255,201,222,0.3)',
                        cursor: 'pointer',
                        color: '#E87FA3',
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      <Trash2 size={18} />
                      <span>重置知识图谱</span>
                    </button>

                    {clearConfirm && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          background: 'rgba(255,249,230,0.8)',
                          borderRadius: 16,
                          border: '1.5px solid #FFE7A8',
                        }}
                      >
                        <div style={{ fontSize: 13, color: '#7A6B85', marginBottom: 12 }}>
                          确定要清除所有已完成的任务吗？
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setClearConfirm(false)}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              borderRadius: 12,
                              border: 'none',
                              background: '#F5F5F5',
                              color: '#999',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={handleClearTasks}
                            disabled={clearing}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              borderRadius: 12,
                              border: 'none',
                              background: 'linear-gradient(135deg, #FFE7A8, #FFD36B)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {clearing ? '清除中...' : '确认清除'}
                          </button>
                        </div>
                      </div>
                    )}

                    {resetConfirm && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          background: 'rgba(255,240,245,0.8)',
                          borderRadius: 16,
                          border: '1.5px solid #FFC9DE',
                        }}
                      >
                        <div style={{ fontSize: 13, color: '#7A6B85', marginBottom: 12 }}>
                          确定要重置整个知识图谱吗？所有节点、连线都将被删除，此操作不可撤销。
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setResetConfirm(false)}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              borderRadius: 12,
                              border: 'none',
                              background: '#F5F5F5',
                              color: '#999',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={handleResetGraph}
                            disabled={resetGraphMutation.isPending}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              borderRadius: 12,
                              border: 'none',
                              background: 'linear-gradient(135deg, #FFB8C9, #FF9DBB)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {resetGraphMutation.isPending ? '重置中...' : '确认重置'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'about' && (
                  <div
                    className="dash-card kb-jelly"
                    style={{ padding: 32, textAlign: 'center' }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🍮</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#4A3B52', marginBottom: 8 }}>
                      智策
                    </div>
                    <div style={{ fontSize: 13, color: '#9B8AA6', marginBottom: 20 }}>
                      个人 AI 决策助手
                    </div>
                    <div style={{ fontSize: 13, color: '#7A6B85', lineHeight: 1.8 }}>
                      用知识网络记录你的成长轨迹，
                      <br />
                      让 AI 帮你做出更好的决策 ✨
                    </div>
                    <div
                      style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTop: '1px solid rgba(255,200,220,0.3)',
                        fontSize: 12,
                        color: '#B8A5C4',
                      }}
                    >
                      made with 🍮 &amp; 💕
                    </div>
                  </div>
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

export default ProfilePage;

import React, { useState, useCallback, useEffect } from 'react';
import { X, Download, Trash2, Info, Settings, User, Check, BarChart2, Clock, Flame, Calendar, Sparkles, ChevronDown, Home } from 'lucide-react';
import { useTheme } from './ThemeContext';
import type { ThemeName } from './theme';
import { knowledgeApi, authApi } from '@client/src/api';
import { isGuestMode } from '@client/src/api/guest-mode';
import { useCardsQuery, useActionTasksQuery, useGraphQuery } from './useKnowledgeData';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { ActivityLog, UserStatsResponse, OperationHistoryItem } from '@shared/api.interface';

interface UserCenterPanelProps {
  open: boolean;
  onClose: () => void;
}

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

const UserCenterPanel: React.FC<UserCenterPanelProps> = ({ open, onClose }) => {
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
    if (!open) return;
    setSyncStatus('syncing');
    const timer = setTimeout(() => setSyncStatus('synced'), 800);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, showAllLogs]);

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
    if (!open) return;
    if (activeTab === 'history' && historyItems.length === 0) {
      void loadHistory(0, false);
    }
  }, [open, activeTab, historyItems.length, loadHistory]);

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

  const handleClose = useCallback(() => {
    setActiveTab('home');
    setHistoryItems([]);
    setHistoryOffset(0);
    setExpandedHistoryId(null);
    onClose();
  }, [onClose]);

  const handleLogout = useCallback(() => {
    if (isGuestMode()) {
      navigate('/login', { replace: true });
      return;
    }
    authApi.clearAuth();
    toast.success('已退出登录');
    navigate('/login', { replace: true });
  }, [navigate]);

  if (!open) return null;

  return (
    <>
      <div
        className="kb-uc-overlay"
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside className="kb-uc-panel" role="dialog" aria-label="用户中心">
        <div className="kb-uc-header">
          <span className="kb-uc-title">个人中心</span>
          <button
            type="button"
            className="kb-uc-close"
            onClick={handleClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="kb-uc-main">
          <nav className="kb-uc-sidebar">
            {[
              { key: 'home', label: '概览', icon: Home },
              { key: 'history', label: '历史记录', icon: Clock },
              { key: 'settings', label: '设置', icon: Settings },
              { key: 'data', label: '数据管理', icon: Download },
              { key: 'about', label: '关于', icon: Info },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`kb-uc-sb-item ${activeTab === item.key ? 'kb-active' : ''}`}
                  onClick={() => setActiveTab(item.key)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="kb-uc-body">
            {activeTab === 'home' && (
              <>
                {/* 个人资料 */}
                <div className="kb-uc-section">
                  <div className="kb-uc-section-head">
                    <User size={14} />
                    <span>个人资料</span>
                  </div>
                  <div className="kb-card kb-jelly kb-uc-profile-card">
                    <div className="kb-uc-avatar">
                      <span role="img" aria-label="user avatar">🐱</span>
                    </div>
                    <div className="kb-uc-name">{user?.nickname || (isGuestMode() ? '游客用户' : '未命名用户')}</div>
                    <div className="kb-uc-identity">
                      {user?.email || (isGuestMode() ? '游客模式' : '未登录')}
                    </div>
                    <div className="kb-uc-quote">
                      "用AI把想法变成产品"
                    </div>
                    <button
                      type="button"
                      className="kb-uc-logout-btn"
                      onClick={handleLogout}
                    >
                      {isGuestMode() ? '去登录' : '退出登录'}
                    </button>
                  </div>
                </div>

                {/* 数据看板 */}
                <div className="kb-uc-section">
                  <div className="kb-uc-section-head">
                    <BarChart2 size={14} />
                    <span>数据看板</span>
                  </div>
                  <div className="kb-card kb-jelly kb-uc-stats-card">
                    <div className="kb-uc-stats-grid">
                      <div className="kb-uc-stat-item">
                        <div className="kb-uc-stat-icon" style={{ background: 'linear-gradient(135deg, #FFE7A8, #FFD4B8)' }}>
                          <Calendar size={14} />
                        </div>
                        <div className="kb-uc-stat-value">{stats?.weekCompletedTasks ?? 0}</div>
                        <div className="kb-uc-stat-label">本周完成</div>
                      </div>
                      <div className="kb-uc-stat-item">
                        <div className="kb-uc-stat-icon" style={{ background: 'linear-gradient(135deg, #B9E7D4, #B8E8E0)' }}>
                          <Check size={14} />
                        </div>
                        <div className="kb-uc-stat-value">{stats?.totalCompletedTasks ?? 0}</div>
                        <div className="kb-uc-stat-label">累计完成</div>
                      </div>
                      <div className="kb-uc-stat-item">
                        <div className="kb-uc-stat-icon" style={{ background: 'linear-gradient(135deg, #FFC9DE, #FFB8C9)' }}>
                          <Flame size={14} />
                        </div>
                        <div className="kb-uc-stat-value">{stats?.streakDays ?? 0}</div>
                        <div className="kb-uc-stat-label">连续天数</div>
                      </div>
                      <div className="kb-uc-stat-item">
                        <div className="kb-uc-stat-icon" style={{ background: 'linear-gradient(135deg, #DCC9F7, #C7DEFA)' }}>
                          <Sparkles size={14} />
                        </div>
                        <div className="kb-uc-stat-value kb-ai-date">
                          {stats?.lastAiSuggestionAt
                            ? new Date(stats.lastAiSuggestionAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                            : '—'}
                        </div>
                        <div className="kb-uc-stat-label">上次AI建议</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 最近活动 */}
                <div className="kb-uc-section">
                  <div className="kb-uc-section-head">
                    <Clock size={14} />
                    <span>最近活动</span>
                    <span className="kb-uc-section-count">{logsTotal}</span>
                  </div>
                  <div className="kb-card kb-jelly kb-uc-history-card">
                    {logsLoading ? (
                      <div className="kb-uc-loading">加载中...</div>
                    ) : activityLogs.length === 0 ? (
                      <div className="kb-uc-empty">暂无操作记录</div>
                    ) : (
                      <div className="kb-uc-history-list">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="kb-uc-history-item">
                            <div className="kb-uc-history-tag" data-type={log.actionType}>
                              {getActionLabel(log.actionType)}
                            </div>
                            <div className="kb-uc-history-content">{log.content}</div>
                            <div className="kb-uc-history-time">{formatTime(log.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {logsTotal > 20 && (
                      <button
                        type="button"
                        className="kb-uc-show-more"
                        onClick={() => setShowAllLogs((v) => !v)}
                      >
                        {showAllLogs ? '收起' : `查看全部（${logsTotal}条）`}
                        <ChevronDown size={12} className={showAllLogs ? 'kb-rotated' : ''} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <div className="kb-uc-history-timeline">
                <div className="kb-uc-timeline-header">
                  <span className="kb-uc-timeline-title">操作历史</span>
                  <span className="kb-uc-timeline-count">共{historyTotal}条</span>
                </div>
                {historyLoading && historyItems.length === 0 ? (
                  <div className="kb-uc-loading">加载中...</div>
                ) : historyItems.length === 0 ? (
                  <div className="kb-uc-empty">
                    <span className="kb-uc-empty-icon">📭</span>
                    <div>暂无操作记录</div>
                  </div>
                ) : (
                  <div className="kb-uc-timeline-list">
                    {historyItems.map((item) => {
                      const meta = getHistoryMeta(item.actionType);
                      const isExpandable = item.actionType === 'ai_suggestion' && item.detail?.fullText;
                      const isExpanded = expandedHistoryId === item.id;
                      const suggestions = (item.detail?.suggestions as Array<{ title: string; content: string }> | undefined) ?? [];
                      return (
                        <div key={item.id} className="kb-uc-timeline-item">
                          <div
                            className="kb-uc-timeline-icon"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            <span>{meta.icon}</span>
                          </div>
                          <div className="kb-uc-timeline-dot" style={{ background: meta.color }} />
                          <div className="kb-uc-timeline-content">
                            {isExpandable ? (
                              <button
                                type="button"
                                className="kb-uc-timeline-expand-btn"
                                onClick={() => setExpandedHistoryId((v) => (v === item.id ? null : item.id))}
                              >
                                <div className="kb-uc-timeline-desc">{item.description}</div>
                                <div className="kb-uc-timeline-chevron">
                                  <ChevronDown size={14} className={isExpanded ? 'kb-rotated' : ''} />
                                </div>
                              </button>
                            ) : (
                              <div className="kb-uc-timeline-desc">{item.description}</div>
                            )}
                            <div className="kb-uc-timeline-time">{formatTime(item.createdAt)}</div>
                            {isExpandable && isExpanded && (
                              <div className="kb-uc-timeline-detail">
                                {suggestions.length > 0 ? (
                                  <div className="kb-uc-timeline-suggestions">
                                    {suggestions.map((s, i) => (
                                      <div key={i} className="kb-uc-tl-sug-item">
                                        <div className="kb-uc-tl-sug-title">
                                          <span className="kb-uc-tl-sug-icon">{SUGGESTION_ICONS[i % SUGGESTION_ICONS.length]}</span>
                                          {s.title}
                                        </div>
                                        <div className="kb-uc-tl-sug-content">{s.content}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="kb-uc-tl-sug-raw">{String(item.detail?.fullText ?? '')}</div>
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
                    className="kb-uc-timeline-more"
                    onClick={() => loadHistory(historyOffset, true)}
                    disabled={historyLoading}
                  >
                    {historyLoading ? '加载中...' : '加载更多'}
                  </button>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="kb-uc-section">
                <div className="kb-uc-section-head">
                  <Settings size={14} />
                  <span>设置</span>
                </div>
                <div className="kb-card kb-jelly kb-uc-settings-card">
                  <div className="kb-uc-setting-row">
                    <div className="kb-uc-setting-label">主题选择</div>
                    <div className="kb-uc-theme-options">
                      {THEME_OPTIONS.map((opt) => (
                        <button
                          key={opt.name}
                          type="button"
                          className={`kb-uc-theme-btn ${theme === opt.name ? 'kb-active' : ''}`}
                          onClick={() => setTheme(opt.name)}
                        >
                          <span className="kb-uc-theme-icon">{opt.icon}</span>
                          <span className="kb-uc-theme-label">{opt.label}</span>
                          {theme === opt.name && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="kb-uc-divider" />
                  <div className="kb-uc-setting-row">
                    <div className="kb-uc-setting-label">默认视图</div>
                    <div className="kb-uc-view-options">
                      {DEFAULT_VIEW_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`kb-uc-view-btn ${defaultView === opt.value ? 'kb-active' : ''}`}
                          onClick={() => setDefaultView(opt.value)}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="kb-uc-divider" />
                  <div className="kb-uc-setting-row">
                    <div className="kb-uc-setting-label">
                      <span>任务到期提醒</span>
                    </div>
                    <button
                      type="button"
                      className={`kb-uc-toggle ${notifyEnabled ? 'kb-on' : ''}`}
                      onClick={() => setNotifyEnabled((v) => !v)}
                      aria-pressed={notifyEnabled}
                      aria-label="任务到期提醒开关"
                    >
                      <span className="kb-uc-toggle-dot" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="kb-uc-section">
                <div className="kb-uc-section-head">
                  <Download size={14} />
                  <span>数据管理</span>
                </div>
                <div className="kb-card kb-jelly kb-uc-data-card">
                  <div className="kb-uc-data-row">
                    <div className="kb-uc-sync-info">
                      <span className={`kb-uc-sync-dot ${syncStatus}`} />
                      <span className="kb-uc-sync-text">
                        {syncStatus === 'synced' ? '已同步' : '同步中...'}
                      </span>
                    </div>
                  </div>
                  <div className="kb-uc-divider" />
                  <button
                    type="button"
                    className="kb-uc-data-btn kb-export"
                    onClick={handleExport}
                  >
                    <Download size={14} />
                    <span>导出数据（JSON）</span>
                  </button>
                  <div className="kb-uc-divider" />
                  {!clearConfirm ? (
                    <button
                      type="button"
                      className="kb-uc-data-btn kb-clear"
                      onClick={() => setClearConfirm(true)}
                    >
                      <Trash2 size={14} />
                      <span>清除已完成任务</span>
                    </button>
                  ) : (
                    <div className="kb-uc-clear-confirm">
                      <span className="kb-uc-clear-text">确定清除已完成的任务？</span>
                      <div className="kb-uc-clear-actions">
                        <button
                          type="button"
                          className="kb-uc-cancel-btn"
                          onClick={() => setClearConfirm(false)}
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          className="kb-uc-confirm-btn"
                          onClick={handleClearTasks}
                          disabled={clearing}
                        >
                          {clearing ? '清除中...' : '确定清除'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="kb-uc-section">
                <div className="kb-uc-section-head">
                  <Info size={14} />
                  <span>关于</span>
                </div>
                <div className="kb-card kb-jelly kb-uc-about-card">
                  <div className="kb-uc-about-logo">
                    <svg viewBox="0 0 40 28" aria-hidden="true">
                      <use href="#i-bow" />
                    </svg>
                    <span className="kb-uc-about-name">智策</span>
                  </div>
                  <div className="kb-uc-about-title">个人AI决策助手</div>
                  <div className="kb-uc-about-version">v1.0.0</div>
                  <div className="kb-uc-about-stack">
                    React + TypeScript + NestJS + PostgreSQL
                  </div>
                  <div className="kb-uc-about-footer">
                    由问心工作室制作
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default UserCenterPanel;

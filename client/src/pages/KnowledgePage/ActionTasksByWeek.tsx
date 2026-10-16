import React, { useMemo, useState, useCallback } from 'react';
import {
  useActionTasksQuery,
  useUpdateActionTaskMutation,
  useDeleteActionTaskMutation,
  useActionTasksOverviewQuery,
  useCreateActionTaskMutation,
} from './useKnowledgeData';
import type { ActionTask, ActionTaskStatus, ActionTaskType } from '@shared/api.interface';
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react';

const STATUS_STYLES: Record<
  ActionTaskStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  todo: {
    bg: 'rgba(180, 180, 190, 0.15)',
    border: 'rgba(180, 180, 190, 0.35)',
    text: '#7A7A8A',
    label: '未开始',
  },
  in_progress: {
    bg: 'rgba(255, 215, 100, 0.22)',
    border: 'rgba(255, 200, 80, 0.5)',
    text: '#B8860B',
    label: '进行中',
  },
  done: {
    bg: 'rgba(130, 210, 170, 0.22)',
    border: 'rgba(100, 200, 150, 0.5)',
    text: '#2E8B57',
    label: '已完成',
  },
};

const TYPE_CONFIG: Record<
  ActionTaskType,
  { label: string; icon: string; className: string }
> = {
  learning: { label: '学习', icon: '📚', className: 'kb-task-type-learning' },
  job_hunting: { label: '投简历', icon: '📮', className: 'kb-task-type-job-hunting' },
  money_making: { label: '赚钱', icon: '💰', className: 'kb-task-type-money-making' },
};

type FilterType = 'all' | ActionTaskType;

const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'learning', label: '📚 学习' },
  { value: 'job_hunting', label: '📮 投简历' },
  { value: 'money_making', label: '💰 赚钱' },
];

function getNextStatus(status: ActionTaskStatus): ActionTaskStatus {
  if (status === 'todo') return 'in_progress';
  if (status === 'in_progress') return 'done';
  return 'todo';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

function isOverdue(dateStr: string | null, status: ActionTaskStatus): boolean {
  if (!dateStr || status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function getWeekBounds(): {
  weekStart: Date;
  weekEnd: Date;
  nextWeekStart: Date;
  nextWeekEnd: Date;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  const nextWeekEnd = new Date(weekEnd);
  nextWeekEnd.setDate(weekEnd.getDate() + 7);
  return { weekStart, weekEnd, nextWeekStart, nextWeekEnd };
}

type WeekGroup = 'thisWeek' | 'nextWeek' | 'later';

interface GroupedTasks {
  thisWeek: ActionTask[];
  nextWeek: ActionTask[];
  later: ActionTask[];
}

const WEEK_LABELS: Record<WeekGroup, string> = {
  thisWeek: '本周',
  nextWeek: '下周',
  later: '以后',
};

const TypeTag: React.FC<{ type: ActionTaskType }> = ({ type }) => {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className={`kb-task-type-tag ${cfg.className}`}>
      <span className="kb-type-dot" />
      <span>{cfg.label}</span>
    </span>
  );
};

const ActionTasksByWeek: React.FC = () => {
  const { data: tasks, isLoading } = useActionTasksQuery();
  const { data: overview } = useActionTasksOverviewQuery();
  const updateMutation = useUpdateActionTaskMutation();
  const deleteMutation = useDeleteActionTaskMutation();
  const createMutation = useCreateActionTaskMutation();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ActionTaskType>('learning');
  const [filter, setFilter] = useState<FilterType>('all');

  const progressPct = overview?.total
    ? Math.round((overview.done / overview.total) * 100)
    : 0;

  const filteredTasks = useMemo((): ActionTask[] => {
    if (!tasks) return [];
    let result: ActionTask[] = tasks;
    if (filter !== 'all') {
      result = result.filter((t: ActionTask): boolean => t.taskType === filter);
    }
    // 按标题去重：相同标题的任务只保留第一条
    const seen = new Set<string>();
    return result.filter((t: ActionTask): boolean => {
      const key = t.title.trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tasks, filter]);

  const sortedTasks = useMemo((): ActionTask[] => {
    return [...filteredTasks].sort((a: ActionTask, b: ActionTask): number => {
      if (!a.dueDate && !b.dueDate) return a.sortOrder - b.sortOrder;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const overdueA = isOverdue(a.dueDate, a.status) ? -1 : 0;
      const overdueB = isOverdue(b.dueDate, b.status) ? -1 : 0;
      if (overdueA !== overdueB) return overdueA - overdueB;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredTasks]);

  const groupedTasks = useMemo((): GroupedTasks => {
    const result: GroupedTasks = { thisWeek: [], nextWeek: [], later: [] };
    const { weekStart, weekEnd, nextWeekStart, nextWeekEnd } = getWeekBounds();

    for (const task of sortedTasks) {
      if (!task.dueDate) {
        result.later.push(task);
        continue;
      }
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due >= weekStart && due <= weekEnd) {
        result.thisWeek.push(task);
      } else if (due >= nextWeekStart && due <= nextWeekEnd) {
        result.nextWeek.push(task);
      } else if (due < weekStart) {
        result.thisWeek.unshift(task);
      } else {
        result.later.push(task);
      }
    }
    return result;
  }, [sortedTasks]);

  const handleToggleStatus = useCallback((task: ActionTask): void => {
    const next = getNextStatus(task.status);
    updateMutation.mutate({ id: task.id, status: next });
  }, [updateMutation]);

  const handleDelete = useCallback((id: string): void => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleAdd = useCallback((): void => {
    if (!newTitle.trim()) return;
    createMutation.mutate(
      { title: newTitle.trim(), status: 'todo', taskType: newType },
      {
        onSuccess: (): void => {
          setNewTitle('');
          setShowAdd(false);
        },
      },
    );
  }, [newTitle, newType, createMutation]);

  const StatusIcon: React.FC<{ status: ActionTaskStatus }> = ({ status }) => {
    if (status === 'done') {
      return <CheckCircle2 size={18} color={STATUS_STYLES.done.text} fill="white" />;
    }
    if (status === 'in_progress') {
      return <Clock size={18} color={STATUS_STYLES.in_progress.text} />;
    }
    return <Circle size={18} color={STATUS_STYLES.todo.text} />;
  };

  const renderTaskItem = (task: ActionTask, isThisWeek: boolean): React.ReactNode => {
    const style = STATUS_STYLES[task.status];
    const overdue = isOverdue(task.dueDate, task.status);
    const statusClass =
      task.status === 'done'
        ? 'kb-status-done'
        : task.status === 'in_progress'
          ? 'kb-status-in-progress'
          : 'kb-status-todo';
    const itemClasses = [
      'kb-task-item',
      statusClass,
      task.status === 'done' ? 'kb-task-done' : '',
      overdue ? 'kb-overdue' : '',
      isThisWeek && !overdue && task.status !== 'done' ? 'kb-this-week' : '',
      task.isStarred && !overdue ? 'kb-starred' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        key={task.id}
        className={itemClasses}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 18,
          background: style.bg,
          border: `1px solid ${style.border}`,
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        <button
          className={`kb-task-status-btn ${statusClass}`}
          onClick={(): void => handleToggleStatus(task)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            border: 'none',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e): void => {
            e.currentTarget.style.transform = 'scale(0.85)';
          }}
          onMouseUp={(e): void => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e): void => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <StatusIcon status={task.status} />
        </button>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            minWidth: 0,
          }}
        >
          <span
            className="kb-task-title"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: task.status === 'done' ? 'var(--ink-3)' : 'var(--ink-1)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              wordBreak: 'break-word',
              lineHeight: 1.4,
            }}
          >
            {task.title}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <TypeTag type={task.taskType} />
            {task.isStarred && (
              <span className="kb-task-star-badge">
                <span className="kb-star-icon">⭐</span>
                <span>面试必问</span>
              </span>
            )}
            {task.dueDate && (
              <div
                className="kb-task-due"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: overdue ? '#E74C3C' : 'var(--ink-3)',
                  fontWeight: 500,
                }}
              >
                <Calendar size={11} />
                <span>{formatDate(task.dueDate)}</span>
                {overdue && <span style={{ color: '#E74C3C', fontWeight: 700 }}>· 已逾期</span>}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={(): void => handleDelete(task.id)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
            opacity: 0.5,
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e): void => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.color = '#E74C3C';
          }}
          onMouseLeave={(e): void => {
            e.currentTarget.style.opacity = '0.5';
            e.currentTarget.style.color = 'var(--ink-3)';
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    );
  };

  const renderWeekGroup = (group: WeekGroup): React.ReactNode => {
    const groupTasks = groupedTasks[group];
    const isThisWeek = group === 'thisWeek';
    return (
      <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink-1)',
            }}
          >
            {WEEK_LABELS[group]}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              fontWeight: 500,
            }}
          >
            {groupTasks.length} 项
          </span>
        </div>

        {isLoading && (
          <div
            style={{
              padding: '16px 0',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontSize: 12,
            }}
          >
            加载中...
          </div>
        )}

        {!isLoading && groupTasks.length === 0 && (
          <div
            style={{
              padding: '14px 0',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontSize: 12,
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 14,
            }}
          >
            暂无任务～
          </div>
        )}

        {groupTasks.map((task: ActionTask): React.ReactNode =>
          renderTaskItem(task, isThisWeek),
        )}
      </div>
    );
  };

  return (
    <div
      className="kb-card kb-jelly kb-action-tasks-card"
      style={{ '--_c': '#FFD4B8' } as React.CSSProperties}
    >
      <div className="kb-card-title" style={{ marginBottom: 16 }}>
        <div className="kb-icon" style={{ background: '#FFD4B8' }}>
          <span style={{ fontSize: '1.1em' }}>📋</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          <span style={{ fontWeight: 600 }}>行动任务追踪</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              fontWeight: 500,
            }}
          >
            {overview
              ? `已完成 ${overview.done}/${overview.total} · 本周 +${overview.weekDone}`
              : '加载中...'}
          </span>
        </div>
        <button
          className="kb-task-add-btn"
          onClick={(): void => setShowAdd((v) => !v)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            border: 'none',
            background: 'rgba(255, 212, 184, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D4723A',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e): void => {
            e.currentTarget.style.transform = 'scale(0.92)';
          }}
          onMouseUp={(e): void => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e): void => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 10,
            borderRadius: 5,
            background: 'rgba(255, 182, 193, 0.3)',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 5,
              background:
                'linear-gradient(90deg, #FFB8C9 0%, #FF8FAB 100%)',
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.5)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#D4723A',
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {progressPct}%
        </span>
      </div>

      <div className="kb-task-filter">
        {FILTER_OPTIONS.map((opt): React.ReactNode => (
          <button
            key={opt.value}
            type="button"
            className={`kb-filter-btn ${filter === opt.value ? 'kb-filter-active' : ''}`}
            onClick={(): void => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showAdd && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 16,
            background: 'rgba(255, 212, 184, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            value={newTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              setNewTitle(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="输入新任务..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'white',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--ink-1)',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>类型：</span>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {(Object.keys(TYPE_CONFIG) as ActionTaskType[]).map(
                (t: ActionTaskType): React.ReactNode => (
                  <button
                    key={t}
                    type="button"
                    onClick={(): void => setNewType(t)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 10,
                      border: newType === t
                        ? '1.5px solid #FFB8C9'
                        : '1px solid rgba(255,255,255,0.6)',
                      background: newType === t
                        ? 'rgba(255, 184, 201, 0.3)'
                        : 'rgba(255, 255, 255, 0.5)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: newType === t ? '#D4723A' : 'var(--ink-2)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                  </button>
                ),
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || createMutation.isPending}
              style={{
                padding: '6px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#FFB8C9',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                opacity: newTitle.trim() ? 1 : 0.5,
              }}
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {renderWeekGroup('thisWeek')}
        {renderWeekGroup('nextWeek')}
        {renderWeekGroup('later')}
      </div>
    </div>
  );
};

export default ActionTasksByWeek;

import React, { useMemo, useState } from 'react';
import {
  useActionTasksQuery,
  useUpdateActionTaskMutation,
  useDeleteActionTaskMutation,
  useActionTasksOverviewQuery,
  useCreateActionTaskMutation,
} from './useKnowledgeData';
import type { ActionTask, ActionTaskStatus, ActionTaskType } from '@shared/api.interface';
import { Calendar, Plus, Trash2, CheckCircle2, Clock, Circle, CalendarClock } from 'lucide-react';

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

const TYPE_COLORS: Record<ActionTaskType, { dot: string; label: string }> = {
  learning: { dot: '#5B9BD5', label: '学习' },
  job_hunting: { dot: '#FF9F6E', label: '投简历' },
  money_making: { dot: '#5FC99E', label: '赚钱' },
};

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

const ActionTasksList: React.FC = () => {
  const { data: tasks, isLoading } = useActionTasksQuery();
  const { data: overview } = useActionTasksOverviewQuery();
  const updateMutation = useUpdateActionTaskMutation();
  const deleteMutation = useDeleteActionTaskMutation();
  const createMutation = useCreateActionTaskMutation();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const sortedTasks = useMemo((): ActionTask[] => {
    if (!tasks) return [];
    // 按标题去重：相同标题的任务只保留第一条
    const seen = new Set<string>();
    const deduped = tasks.filter((t: ActionTask): boolean => {
      const key = t.title.trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...deduped].sort((a: ActionTask, b: ActionTask): number => {
      if (!a.dueDate && !b.dueDate) return a.sortOrder - b.sortOrder;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const overdueA = isOverdue(a.dueDate, a.status) ? -1 : 0;
      const overdueB = isOverdue(b.dueDate, b.status) ? -1 : 0;
      if (overdueA !== overdueB) return overdueA - overdueB;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks]);

  const progressPct = overview?.total
    ? Math.round((overview.done / overview.total) * 100)
    : 0;

  const handleToggleStatus = (task: ActionTask): void => {
    const next = getNextStatus(task.status);
    updateMutation.mutate({ id: task.id, status: next });
  };

  const handleDelete = (id: string): void => {
    deleteMutation.mutate(id);
  };

  const handleMarkDone = (task: ActionTask): void => {
    updateMutation.mutate({ id: task.id, status: 'done' });
  };

  const handlePostpone7Days = (task: ActionTask): void => {
    if (!task.dueDate) return;
    const due = new Date(task.dueDate);
    due.setDate(due.getDate() + 7);
    const newDue = due.toISOString().split('T')[0];
    updateMutation.mutate({ id: task.id, dueDate: newDue });
  };

  const handleAdd = (): void => {
    if (!newTitle.trim()) return;
    createMutation.mutate(
      { title: newTitle.trim(), status: 'todo' },
      {
        onSuccess: (): void => {
          setNewTitle('');
          setShowAdd(false);
        },
      },
    );
  };

  const StatusIcon: React.FC<{ status: ActionTaskStatus }> = ({ status }) => {
    if (status === 'done') {
      return <CheckCircle2 size={18} color={STATUS_STYLES.done.text} fill="white" />;
    }
    if (status === 'in_progress') {
      return <Clock size={18} color={STATUS_STYLES.in_progress.text} />;
    }
    return <Circle size={18} color={STATUS_STYLES.todo.text} />;
  };

  return (
    <div className="kb-card kb-jelly kb-action-tasks-card" style={{ '--_c': '#FFD4B8' } as React.CSSProperties}>
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

      {showAdd && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 16,
            background: 'rgba(255, 212, 184, 0.2)',
            display: 'flex',
            gap: 8,
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
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'white',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--ink-1)',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || createMutation.isPending}
            style={{
              padding: '8px 16px',
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
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            加载中...
          </div>
        )}
        {!isLoading && tasks?.length === 0 && (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--ink-3)',
              fontSize: 13,
            }}
          >
            还没有任务，点右上角 + 添加一个吧～
          </div>
        )}
          {sortedTasks.map((task: ActionTask) => {
           const style = STATUS_STYLES[task.status];
           const overdue = isOverdue(task.dueDate, task.status);
           const typeColor = TYPE_COLORS[task.taskType];
           const statusClass =
             task.status === 'done'
               ? 'kb-status-done'
               : task.status === 'in_progress'
               ? 'kb-status-in-progress'
               : 'kb-status-todo';
           const itemClass = [
             'kb-task-item',
             statusClass,
             task.status === 'done' ? 'kb-task-done' : '',
             overdue ? 'kb-overdue' : '',
             task.isStarred && !overdue ? 'kb-starred' : '',
           ].filter(Boolean).join(' ');
           return (
             <div
               key={task.id}
               className={itemClass}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: 10,
                 padding: '10px 14px',
                 borderRadius: 16,
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
                     gap: 4,
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
                       gap: 10,
                       flexWrap: 'wrap',
                     }}
                   >
                     <span
                       style={{
                         display: 'inline-flex',
                         alignItems: 'center',
                         gap: 5,
                         fontSize: 10,
                         fontWeight: 600,
                         color: 'var(--ink-2)',
                       }}
                     >
                       <span
                         style={{
                           width: 6,
                           height: 6,
                           borderRadius: '50%',
                           background: typeColor.dot,
                         }}
                       />
                       {typeColor.label}
                     </span>
                     {task.isStarred && (
                       <span
                         style={{
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: 3,
                           fontSize: 10,
                           fontWeight: 700,
                           color: '#E74C3C',
                           padding: '2px 7px',
                           borderRadius: 8,
                           background: 'rgba(255, 200, 210, 0.5)',
                           border: '1px solid rgba(255, 120, 140, 0.35)',
                           whiteSpace: 'nowrap',
                         }}
                       >
                         <span style={{ fontSize: 10, lineHeight: 1 }}>⭐</span>
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
                        {overdue && <span style={{ color: '#E74C3C' }}>· 已逾期</span>}
                      </div>
                    )}
                   </div>
                 </div>

                {overdue && task.status === 'todo' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(): void => handleMarkDone(task)}
                      title="标记完成"
                      aria-label="标记完成"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        border: 'none',
                        background: 'rgba(185, 231, 212, 0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2E8B57',
                        transition: 'all 0.15s ease',
                        minWidth: 28,
                      }}
                      onMouseDown={(e): void => {
                        e.currentTarget.style.transform = 'scale(0.9)';
                      }}
                      onMouseUp={(e): void => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onMouseLeave={(e): void => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <CheckCircle2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(): void => handlePostpone7Days(task)}
                      title="延期7天"
                      aria-label="延期7天"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        border: 'none',
                        background: 'rgba(199, 222, 250, 0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4A7FB5',
                        transition: 'all 0.15s ease',
                        minWidth: 28,
                      }}
                      onMouseDown={(e): void => {
                        e.currentTarget.style.transform = 'scale(0.9)';
                      }}
                      onMouseUp={(e): void => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onMouseLeave={(e): void => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <CalendarClock size={15} />
                    </button>
                  </div>
                )}

                {!overdue && (
                  <span
                    className={`kb-task-status-label ${statusClass}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: style.text,
                      background: 'rgba(255, 255, 255, 0.6)',
                      padding: '3px 8px',
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  >
                    {style.label}
                  </span>
                )}

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
        })}
      </div>
    </div>
  );
};

export default ActionTasksList;

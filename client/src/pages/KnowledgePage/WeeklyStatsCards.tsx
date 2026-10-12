import React from 'react';
import { useActionTasksOverviewQuery } from './useKnowledgeData';
import { ListTodo, CheckCircle2, Clock } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  iconGradient: string;
  value: number;
  label: string;
  valueColor: string;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconGradient,
  value,
  label,
  valueColor,
  isLoading,
}) => {
  return (
    <div
      className="kb-jelly"
      style={{
        padding: '20px 22px',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        border: '1.5px solid rgba(255, 255, 255, .95)',
        boxShadow: 'var(--sh-1), var(--jelly-in)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 120,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: iconGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow:
            'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(196, 146, 166, .2)',
        }}
      >
        {icon}
      </div>
      <div style={{ marginTop: 'auto', textAlign: 'right' }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: valueColor,
            lineHeight: 1,
            textShadow: '0 2px 4px rgba(255, 255, 255, 0.6)',
          }}
        >
          {isLoading ? (
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)' }}>
              ...
            </span>
          ) : (
            value
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink-3)',
            marginTop: 6,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

const WeeklyStatsCards: React.FC = () => {
  const { data: overview, isLoading } = useActionTasksOverviewQuery();

  const total = overview?.total ?? 0;
  const done = overview?.done ?? 0;
  const inProgress = overview?.inProgress ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <StatCard
        icon={<ListTodo size={20} color="white" />}
        iconGradient="linear-gradient(135deg, #FFB8C9 0%, #FF8FAB 100%)"
        value={total}
        label="总任务数"
        valueColor="#FF6B8A"
        isLoading={isLoading}
      />
      <StatCard
        icon={<CheckCircle2 size={20} color="white" />}
        iconGradient="linear-gradient(135deg, #B9E7D4 0%, #7FCFAD 100%)"
        value={done}
        label="已完成"
        valueColor="#3BA77C"
        isLoading={isLoading}
      />
      <StatCard
        icon={<Clock size={20} color="white" />}
        iconGradient="linear-gradient(135deg, #FFE7A8 0%, #FFD36B 100%)"
        value={inProgress}
        label="进行中"
        valueColor="#D49F2A"
        isLoading={isLoading}
      />
    </div>
  );
};

export default WeeklyStatsCards;

import React, { useState } from 'react';
import { Link2, Pencil, Trash2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { renderSimpleMarkdown } from '@client/src/utils/markdown';
import {
  useInsightsQuery,
  useDeleteInsightMutation,
} from '../useKnowledgeData';
import type { Insight, InsightCredibility, InsightSourceType } from '@shared/api.interface';
import CollectInsightModal from './CollectInsightModal';
import NodeSelectorModal from './NodeSelectorModal';
import { showConfirm } from '@lark-apaas/client-toolkit';

const CREDIBILITY_CONFIG: Record<InsightCredibility, { label: string; className: string }> = {
  high: { label: '可信度高', className: 'bg-green-100 text-green-600' },
  medium: { label: '可信度中', className: 'bg-yellow-100 text-yellow-600' },
  low: { label: '可信度低', className: 'bg-gray-100 text-gray-500' },
};

const SOURCE_LABEL: Record<InsightSourceType, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  zhihu: '知乎',
  other: '其他',
};

const InsightsPanel: React.FC = () => {
  const { data: insights = [], isLoading } = useInsightsQuery();
  const deleteMutation = useDeleteInsightMutation();
  const [collectOpen, setCollectOpen] = useState(false);
  const [nodeSelectorOpen, setNodeSelectorOpen] = useState(false);
  const [currentInsightId, setCurrentInsightId] = useState<string | null>(null);

  const handleDelete = async (id: string): Promise<void> => {
    if (!await showConfirm('确定要删除这个观点吗？')) return;
    deleteMutation.mutate(id, {
      onSuccess: (): void => {
        toast.success('已删除');
      },
      onError: (error): void => {
        logger.error('删除观点失败', error);
        toast.error(error instanceof Error ? error.message : '删除失败');
      },
    });
  };

  const handleOpenLink = (id: string): void => {
    setCurrentInsightId(id);
    setNodeSelectorOpen(true);
  };

  const handleEdit = (insight: Insight): void => {
    // TODO: 编辑功能
    toast.info('编辑功能即将上线');
    void insight;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-400 text-sm">加载中...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="kb-section-title" style={{ marginBottom: 0 }}>
          <span className="kb-section-title-icon">📌</span>
          <span className="kb-section-title-text">收藏观点</span>
        </div>
        <button
          type="button"
          onClick={(): void => setCollectOpen(true)}
          className="kb-welcome-btn"
          style={{ padding: '8px 18px', fontSize: '13px' }}
        >
          + 收藏观点
        </button>
      </div>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(145deg, #FFE7F0, #FFF5F8)',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,.8), 0 4px 12px rgba(255,180,200,.2)',
            }}
          >
            <Lightbulb size={28} style={{ color: '#FFB8D0' }} />
          </div>
          <p className="text-gray-400 text-sm max-w-xs">
            还没有收藏的观点，粘贴一段帖子让 AI 帮你提炼要点吧
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight: Insight) => (
            <div
              key={insight.id}
              className="relative p-4 flex flex-col gap-3"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: '20px',
                border: '1.5px solid rgba(255, 255, 255, 0.9)',
                boxShadow:
                  'inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 6px rgba(255, 180, 200, 0.15), 0 6px 16px rgba(196, 146, 166, 0.15)',
              }}
            >
              <h4 className="font-bold text-sm text-gray-800 leading-snug truncate">
                {insight.title}
              </h4>
              <p
                className="text-xs text-gray-500 leading-relaxed"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(insight.summary || insight.originalContent) }}
              />
              <div className="flex items-center flex-wrap gap-2 mt-auto">
                {insight.credibility && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${CREDIBILITY_CONFIG[insight.credibility].className}`}
                  >
                    {CREDIBILITY_CONFIG[insight.credibility].label}
                  </span>
                )}
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(255, 184, 208, 0.2)', color: '#E87AA5' }}
                >
                  {SOURCE_LABEL[insight.sourceType]}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDate(insight.createdAt)}
                </span>
              </div>
              <div className="absolute bottom-3 right-3 flex gap-1">
                <button
                  type="button"
                  onClick={(): void => handleOpenLink(insight.id)}
                  aria-label="关联图谱"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: insight.linkedNodeId
                      ? 'linear-gradient(145deg, #B9E7D4, #D4F5E8)'
                      : 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    color: insight.linkedNodeId ? '#5BBE99' : '#9CA3AF',
                    boxShadow: '0 2px 6px rgba(196, 146, 166, 0.1)',
                  }}
                >
                  <Link2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={(): void => handleEdit(insight)}
                  aria-label="编辑"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    color: '#9CA3AF',
                    boxShadow: '0 2px 6px rgba(196, 146, 166, 0.1)',
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={(): Promise<void> => handleDelete(insight.id)}
                  aria-label="删除"
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    color: '#9CA3AF',
                    boxShadow: '0 2px 6px rgba(196, 146, 166, 0.1)',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CollectInsightModal open={collectOpen} onClose={(): void => setCollectOpen(false)} />
      <NodeSelectorModal
        open={nodeSelectorOpen}
        insightId={currentInsightId}
        onClose={(): void => {
          setNodeSelectorOpen(false);
          setCurrentInsightId(null);
        }}
      />
    </>
  );
};

export default InsightsPanel;

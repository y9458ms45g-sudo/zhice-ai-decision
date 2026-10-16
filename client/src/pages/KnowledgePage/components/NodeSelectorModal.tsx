import React, { useState, useEffect } from 'react';
import { X, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useGraphQuery, useLinkInsightNodeMutation } from '../useKnowledgeData';
import type { KnowledgeNode } from '@shared/api.interface';

interface NodeSelectorModalProps {
  open: boolean;
  insightId: string | null;
  onClose: () => void;
}

const NodeSelectorModal: React.FC<NodeSelectorModalProps> = ({
  open,
  insightId,
  onClose,
}) => {
  const { data: graph } = useGraphQuery();
  const linkMutation = useLinkInsightNodeMutation();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setSelectedNodeId(undefined);
    }
  }, [open]);

  const handleConfirm = (): void => {
    if (!insightId) return;
    const targetNodeId = selectedNodeId;
    linkMutation.mutate(
      { id: insightId, linkedNodeId: targetNodeId },
      {
        onSuccess: (): void => {
          toast.success(targetNodeId ? '已关联到知识节点' : '已取消关联');
          onClose();
        },
        onError: (error): void => {
          logger.error('关联节点失败', error);
          toast.error(error instanceof Error ? error.message : '关联失败');
        },
      },
    );
  };

  const handleUnlink = (): void => {
    if (!insightId) return;
    linkMutation.mutate(
      { id: insightId, linkedNodeId: undefined },
      {
        onSuccess: (): void => {
          toast.success('已取消关联');
          onClose();
        },
        onError: (error): void => {
          logger.error('取消关联失败', error);
          toast.error(error instanceof Error ? error.message : '操作失败');
        },
      },
    );
  };

  if (!open) return null;

  const nodes: KnowledgeNode[] = graph?.nodes ?? [];

  return (
    <div
      className="kb-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="kb-modal-box"
        onClick={(e): void => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="kb-jelly"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,.95)',
            background: 'linear-gradient(145deg, #FFFDFA, var(--cream-2))',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: 'var(--sh-1)',
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 700 }}>
          关联知识节点
        </h3>

        <div
          className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto pr-1"
          style={{ marginBottom: '20px' }}
        >
          {nodes.map((node: KnowledgeNode) => (
            <button
              key={node.id}
              type="button"
              onClick={(): void =>
                setSelectedNodeId(selectedNodeId === node.id ? undefined : node.id)
              }
              className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105"
              style={{
                background:
                  selectedNodeId === node.id
                    ? 'linear-gradient(145deg, #FFE7F0, #FFF5F8)'
                    : 'rgba(255, 255, 255, 0.6)',
                border:
                  selectedNodeId === node.id
                    ? '2px solid #FFB8D0'
                    : '1.5px solid rgba(255, 255, 255, 0.9)',
                boxShadow:
                  selectedNodeId === node.id
                    ? '0 6px 16px rgba(255, 184, 208, 0.35)'
                    : '0 2px 8px rgba(196, 146, 166, 0.1)',
                cursor: 'pointer',
              }}
              aria-pressed={selectedNodeId === node.id}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: node.color,
                  boxShadow: 'inset 0 2px 3px rgba(255,255,255,.6), 0 2px 6px rgba(0,0,0,.08)',
                }}
              >
                {node.icon}
              </div>
              <span className="text-xs font-medium text-gray-700 truncate w-full text-center">
                {node.name}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleUnlink}
            className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              color: '#888',
              border: '1.5px solid rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(196, 146, 166, 0.1)',
            }}
          >
            <Unlink size={14} />
            取消关联
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={linkMutation.isPending || !selectedNodeId}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(145deg, #FFB8D0 0%, #FFD6E8 45%, #D4E4FC 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              boxShadow:
                'inset 0 2px 3px rgba(255, 255, 255, .65), 0 6px 16px rgba(196, 146, 166, .3)',
              cursor: linkMutation.isPending ? 'wait' : 'pointer',
              textShadow: '0 1px 2px rgba(180, 82, 122, .2)',
            }}
          >
            <Link2 size={14} />
            确认关联
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeSelectorModal;

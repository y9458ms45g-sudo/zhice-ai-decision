import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  useExtractInsightMutation,
  useCreateInsightMutation,
} from '../useKnowledgeData';
import type {
  InsightSourceType,
  InsightCredibility,
  ExtractedInsight,
  CreateInsightRequest,
} from '@shared/api.interface';

interface CollectInsightModalProps {
  open: boolean;
  onClose: () => void;
}

const SOURCE_OPTIONS: { value: InsightSourceType; label: string }[] = [
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'zhihu', label: '知乎' },
  { value: 'other', label: '其他' },
];

const CREDIBILITY_OPTIONS: { value: InsightCredibility; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const CollectInsightModal: React.FC<CollectInsightModalProps> = ({ open, onClose }) => {
  const [stage, setStage] = useState<'input' | 'edit'>('input');
  const [content, setContent] = useState('');
  const [sourceType, setSourceType] = useState<InsightSourceType>('other');
  const [extracted, setExtracted] = useState<ExtractedInsight | null>(null);

  const extractMutation = useExtractInsightMutation();
  const createMutation = useCreateInsightMutation();
  const abortRef = useRef<AbortController | null>(null);
  const isUserClosingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setStage('input');
      setContent('');
      setSourceType('other');
      setExtracted(null);
      isUserClosingRef.current = false;
    }
    return (): void => {
      if (abortRef.current) {
        isUserClosingRef.current = true;
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [open]);

  const handleExtract = async (): Promise<void> => {
    if (!content.trim()) {
      toast.warning('请先粘贴内容');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await extractMutation.mutateAsync({
        content: content.trim(),
        sourceType,
        signal: controller.signal,
      });
      setExtracted(result);
      setStage('edit');
    } catch (error) {
      logger.error('提取观点失败', error);
      if (isUserClosingRef.current) return;
      const msg =
        error instanceof Error && error.message
          ? error.message
          : 'AI 提取失败，请重试';
      toast.error(msg.includes('timeout') || msg.includes('超时') ? 'AI 响应超时，请重试' : msg);
    } finally {
      abortRef.current = null;
    }
  };

  const handleSave = (): void => {
    if (!extracted || !extracted.title.trim()) {
      toast.warning('标题不能为空');
      return;
    }
    const dto: CreateInsightRequest = {
      title: extracted.title.trim(),
      originalContent: content.trim(),
      summary: extracted.summary,
      counterIntuitive: extracted.counterIntuitive,
      applicableScenario: extracted.applicableScenario,
      actionItem: extracted.actionItem,
      credibility: extracted.credibility,
      sourceType,
    };
    createMutation.mutate(dto, {
      onSuccess: (): void => {
        toast.success('已保存到收藏');
        onClose();
      },
      onError: (error): void => {
        logger.error('保存观点失败', error);
        toast.error(error instanceof Error ? error.message : '保存失败');
      },
    });
  };

  const handleBack = (): void => {
    setStage('input');
  };

  const updateExtracted = (key: keyof ExtractedInsight, value: string): void => {
    setExtracted((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (!open) return null;

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
        style={{ maxWidth: stage === 'edit' ? '520px' : '480px' }}
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
          {stage === 'input' ? '收藏新观点' : '编辑并保存'}
        </h3>

        {stage === 'input' ? (
          <div className="flex flex-col gap-4">
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                粘贴原文
              </label>
              <textarea
                value={content}
                onChange={(e): void => setContent(e.target.value)}
                placeholder="粘贴抖音/小红书/知乎的帖子原文..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  minHeight: '120px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>
                来源
              </label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(): void => setSourceType(opt.value)}
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background:
                        sourceType === opt.value
                          ? 'linear-gradient(145deg, #FFB8D0, #FFD6E8)'
                          : 'rgba(255, 255, 255, 0.6)',
                      color: sourceType === opt.value ? '#fff' : '#888',
                      border: '1.5px solid rgba(255, 255, 255, 0.9)',
                      boxShadow:
                        sourceType === opt.value
                          ? 'inset 0 2px 3px rgba(255,255,255,.65), 0 4px 10px rgba(196, 146, 166, .25)'
                          : '0 2px 6px rgba(196, 146, 166, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: '#888',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(196, 146, 166, 0.1)',
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExtract}
                disabled={extractMutation.isPending || !content.trim()}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{
                  background: 'linear-gradient(145deg, #FFB8D0 0%, #FFD6E8 45%, #D4E4FC 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.8)',
                  boxShadow:
                    'inset 0 2px 3px rgba(255, 255, 255, .65), 0 6px 16px rgba(196, 146, 166, .3)',
                  cursor: extractMutation.isPending ? 'wait' : 'pointer',
                  textShadow: '0 1px 2px rgba(180, 82, 122, .2)',
                }}
              >
                <Sparkles size={16} />
                {extractMutation.isPending ? 'AI 正在整理...' : 'AI 提取要点'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                标题
              </label>
              <input
                type="text"
                value={extracted?.title || ''}
                onChange={(e): void => updateExtracted('title', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 1px 3px rgba(255, 180, 200, 0.1)',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                核心观点
              </label>
              <textarea
                value={extracted?.summary || ''}
                onChange={(e): void => updateExtracted('summary', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 1px 3px rgba(255, 180, 200, 0.1)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                反直觉的点
              </label>
              <textarea
                value={extracted?.counterIntuitive || ''}
                onChange={(e): void => updateExtracted('counterIntuitive', e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 1px 3px rgba(255, 180, 200, 0.1)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                适用场景
              </label>
              <textarea
                value={extracted?.applicableScenario || ''}
                onChange={(e): void => updateExtracted('applicableScenario', e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 1px 3px rgba(255, 180, 200, 0.1)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                行动建议
              </label>
              <textarea
                value={extracted?.actionItem || ''}
                onChange={(e): void => updateExtracted('actionItem', e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: 'inset 0 1px 3px rgba(255, 180, 200, 0.1)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: '#666' }}>
                可信度
              </label>
              <div className="flex gap-2">
                {CREDIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(): void =>
                      updateExtracted('credibility', opt.value)
                    }
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background:
                        extracted?.credibility === opt.value
                          ? 'linear-gradient(145deg, #FFB8D0, #FFD6E8)'
                          : 'rgba(255, 255, 255, 0.6)',
                      color: extracted?.credibility === opt.value ? '#fff' : '#888',
                      border: '1.5px solid rgba(255, 255, 255, 0.9)',
                      boxShadow:
                        extracted?.credibility === opt.value
                          ? 'inset 0 2px 3px rgba(255,255,255,.65), 0 4px 10px rgba(196, 146, 166, .25)'
                          : '0 2px 6px rgba(196, 146, 166, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-1 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: '#888',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(196, 146, 166, 0.1)',
                }}
              >
                <ArrowLeft size={14} />
                返回修改
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{
                  background: 'linear-gradient(145deg, #FFB8D0 0%, #FFD6E8 45%, #D4E4FC 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.8)',
                  boxShadow:
                    'inset 0 2px 3px rgba(255, 255, 255, .65), 0 6px 16px rgba(196, 146, 166, .3)',
                  cursor: createMutation.isPending ? 'wait' : 'pointer',
                  textShadow: '0 1px 2px rgba(180, 82, 122, .2)',
                }}
              >
                {createMutation.isPending ? '保存中...' : '保存到收藏'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectInsightModal;

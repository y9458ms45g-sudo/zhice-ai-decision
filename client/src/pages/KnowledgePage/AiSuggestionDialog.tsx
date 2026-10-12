import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, History, ChevronLeft } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { knowledgeApi } from '@client/src/api';
import type { AiSuggestionItem, AiConversation } from '@shared/api.interface';

interface AiSuggestionDialogProps {
  open: boolean;
  onClose: () => void;
}

const CARD_ICONS = ['💡', '🎯', '🚀'];

const AiSuggestionDialog: React.FC<AiSuggestionDialogProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AiConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSuggestions = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.analyzeKnowledge();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      logger.error('AI 建议加载失败', err);
      setError('AI 暂时有点累了，稍后再试试吧～');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (): Promise<void> => {
    setHistoryLoading(true);
    try {
      const data = await knowledgeApi.getAiConversations();
      setHistory(data.items);
    } catch (err) {
      logger.error('加载AI历史失败', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleToggleHistory = useCallback((): void => {
    if (!showHistory) {
      void fetchHistory();
    }
    setShowHistory((v) => !v);
  }, [showHistory, fetchHistory]);

  const parseHistorySuggestions = (text: string): AiSuggestionItem[] => {
    if (!text || !text.trim()) return [];
    const parts = text.split('===').map((p) => p.trim()).filter((p) => p.length > 0);
    return parts.map((part) => {
      const lines = part.split('\n').filter((line) => line.trim().length > 0);
      let title = '';
      let content = '';
      if (lines[0]?.startsWith('## ')) {
        title = lines[0].slice(3).trim();
        content = lines.slice(1).map((l) => l.trim()).join('\n');
      } else {
        title = lines[0] || '';
        content = lines.slice(1).map((l) => l.trim()).join('\n');
      }
      return { title, content };
    }).filter((s) => s.title || s.content);
  };

  useEffect(() => {
    if (open) {
      setSuggestions([]);
      setError(null);
      setShowHistory(false);
      void fetchSuggestions();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return (): void => {
      document.body.style.overflow = '';
    };
  }, [open, fetchSuggestions]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="kb-ai-dialog-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-ai-dialog-title"
    >
      <div className="kb-ai-dialog">
        <button
          type="button"
          className="kb-ai-dialog-close"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <h2 id="kb-ai-dialog-title" className="kb-ai-dialog-title">
          {showHistory ? '历史建议' : 'AI 智能建议'}
        </h2>

        <button
          type="button"
          className={`kb-ai-history-btn ${showHistory ? 'kb-active' : ''}`}
          onClick={handleToggleHistory}
          aria-label="历史记录"
        >
          {showHistory ? <ChevronLeft size={16} /> : <History size={16} />}
        </button>

        {showHistory ? (
          <div className="kb-ai-history-panel">
            {historyLoading ? (
              <div className="kb-ai-loading-text">加载中...</div>
            ) : history.length === 0 ? (
              <div className="kb-ai-history-empty">
                <div className="kb-ai-error-icon">📭</div>
                <p>还没有历史建议记录～</p>
              </div>
            ) : (
              <div className="kb-ai-history-list">
                {history.map((conv) => {
                  const items = parseHistorySuggestions(conv.aiResponse);
                  return (
                    <div key={conv.id} className="kb-ai-history-item">
                      <div className="kb-ai-history-date">
                        {new Date(conv.createdAt).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="kb-ai-history-items">
                        {items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="kb-ai-history-suggestion">
                            <span className="kb-ai-history-suggestion-icon">
                              {CARD_ICONS[idx] ?? '✨'}
                            </span>
                            <span className="kb-ai-history-suggestion-title">
                              {item.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {loading && (
              <div className="kb-ai-loading">
                <div className="kb-ai-loading-dots">
                  <span className="kb-ai-loading-dot kb-ai-dot-1" />
                  <span className="kb-ai-loading-dot kb-ai-dot-2" />
                  <span className="kb-ai-loading-dot kb-ai-dot-3" />
                </div>
                <p className="kb-ai-loading-text">正在分析你的知识网络...</p>
              </div>
            )}

            {!loading && error && (
              <div className="kb-ai-error">
                <div className="kb-ai-error-icon">😴</div>
                <p className="kb-ai-error-text">{error}</p>
                <button
                  type="button"
                  className="kb-ai-regenerate-btn"
                  onClick={(): void => void fetchSuggestions()}
                >
                  <RefreshCw size={16} strokeWidth={2} />
                  重新分析
                </button>
              </div>
            )}

            {!loading && !error && suggestions.length > 0 && (
              <>
                <div className="kb-ai-suggestion-list">
                  {suggestions.slice(0, 3).map((item: AiSuggestionItem, index: number): React.ReactNode => (
                    <div key={index} className="kb-ai-suggestion-card">
                      <div className="kb-ai-suggestion-icon" aria-hidden="true">
                        {CARD_ICONS[index] ?? '✨'}
                      </div>
                      <h3 className="kb-ai-suggestion-title">{item.title}</h3>
                      <p className="kb-ai-suggestion-content">{item.content}</p>
                    </div>
                  ))}
                </div>
                <div className="kb-ai-dialog-footer">
                  <button
                    type="button"
                    className="kb-ai-regenerate-btn"
                    onClick={(): void => void fetchSuggestions()}
                  >
                    <RefreshCw size={16} strokeWidth={2} />
                    重新生成
                  </button>
                </div>
              </>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <div className="kb-ai-error">
                <div className="kb-ai-error-icon">🤔</div>
                <p className="kb-ai-error-text">暂时没有想到什么好建议～</p>
                <button
                  type="button"
                  className="kb-ai-regenerate-btn"
                  onClick={(): void => void fetchSuggestions()}
                >
                  <RefreshCw size={16} strokeWidth={2} />
                  再想想
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AiSuggestionDialog;

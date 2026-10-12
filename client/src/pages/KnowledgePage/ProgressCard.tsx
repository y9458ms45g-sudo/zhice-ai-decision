import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Check, Loader2, Edit3 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CardContent } from '@shared/api.interface';
import { knowledgeApi } from '@client/src/api';
import {
  useCardsQuery,
  useUpdateCardMutation,
} from './useKnowledgeData';

type SaveStatus = 'idle' | 'saving' | 'saved';

const PROGRESS_SECTION_KEY = 'progress_90days';
const PROGRESS_TITLE = '90天行动进度';
const PROGRESS_EMOJI = '⏳';
const PROGRESS_COLOR = 'var(--mint-d)';

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const check = (): void => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    check();
    window.addEventListener('resize', check);
    return (): void => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

const ProgressCard: React.FC = () => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [editingValue, setEditingValue] = useState<string | undefined>(undefined);
  const [progressVal, setProgressVal] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const composingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editableRef = useRef<HTMLDivElement | null>(null);

  const cardsQuery = useCardsQuery();
  const updateCardMutation = useUpdateCardMutation();
  const isMobile = useIsMobile();

  const cards: CardContent[] = cardsQuery.data ?? [];
  const serverDataLoaded = cardsQuery.isSuccess && cards.length > 0;

  const serverContent = useMemo((): string => {
    const card = cards.find(
      (c: CardContent): boolean => c.sectionKey === PROGRESS_SECTION_KEY,
    );
    return card?.content ?? '0';
  }, [cards]);

  const displayValue = editingValue !== undefined ? editingValue : serverContent;

  // Initialize progress from server
  useEffect(() => {
    if (!cardsQuery.data) return;
    const n = Math.max(0, Math.min(100, Number(serverContent) || 0));
    setProgressVal(n);
  }, [cardsQuery.data, serverContent]);

  const saveCard = useCallback(
    (content: string): void => {
      setSaveStatus('saving');
      updateCardMutation.mutate(
        { sectionKey: PROGRESS_SECTION_KEY, content },
        {
          onSuccess: (result): void => {
            setEditingValue(undefined);
            const n = Math.max(0, Math.min(100, Number(result.content) || 0));
            setProgressVal(n);
            setSaveStatus('saved');
            setTimeout((): void => {
              setSaveStatus('idle');
            }, 1500);
          },
          onError: (): void => {
            setSaveStatus('idle');
          },
        },
      );
    },
    [updateCardMutation],
  );

  const scheduleSave = useCallback(
    (content: string): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout((): void => {
        void saveCard(content);
        debounceTimerRef.current = null;
      }, 500);
    },
    [saveCard],
  );

  const handleContentChange = useCallback(
    (rawValue: string): void => {
      if (composingRef.current) return;
      const val = rawValue.replace(/[^\d]/g, '');
      const numVal = Math.max(0, Math.min(100, Number(val) || 0));
      setEditingValue(val || '0');
      setProgressVal(numVal);
      scheduleSave(val || '0');
    },
    [scheduleSave],
  );

  const handleBlur = useCallback((): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const currentContent =
      editingValue !== undefined ? editingValue : serverContent;
    void saveCard(currentContent);
    setIsEditing(false);
    composingRef.current = false;
  }, [saveCard, editingValue, serverContent]);

  // Sync to DOM
  useEffect(() => {
    if (!serverDataLoaded) return;
    if (isEditing) return;
    if (editableRef.current && editableRef.current.innerText !== serverContent) {
      editableRef.current.innerText = serverContent;
    }
  }, [serverDataLoaded, serverContent, isEditing]);

  // Flush on unload
  useEffect(() => {
    const flushPending = (): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (editingValue !== undefined) {
        void knowledgeApi.updateCard(PROGRESS_SECTION_KEY, editingValue).catch(
          (err): void => {
            logger.error('离开页面前保存进度失败', err);
          },
        );
      }
    };
    window.addEventListener('beforeunload', flushPending);
    window.addEventListener('pagehide', flushPending);
    return (): void => {
      window.removeEventListener('beforeunload', flushPending);
      window.removeEventListener('pagehide', flushPending);
    };
  }, [editingValue]);

  const renderSaveIndicator = (): React.ReactNode => {
    if (saveStatus === 'saving') {
      return (
        <span className="kb-save-status">
          <Loader2 size={12} />
          保存中
        </span>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <span className="kb-save-status" style={{ color: '#2F6B57' }}>
          <Check size={12} />
          已保存
        </span>
      );
    }
    return null;
  };

  if (cardsQuery.isLoading && !cardsQuery.isFetched) {
    return (
      <div className="kb-card kb-jelly">
        <div className="kb-card-title">
          <div className="kb-icon" style={{ background: PROGRESS_COLOR }}>
            <span style={{ fontSize: '1.1em' }}>{PROGRESS_EMOJI}</span>
          </div>
          <span>{PROGRESS_TITLE}</span>
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="kb-card kb-jelly">
      {renderSaveIndicator()}
      <div className="kb-card-title">
        <div className="kb-icon" style={{ background: PROGRESS_COLOR }}>
          <span style={{ fontSize: '1.1em' }}>{PROGRESS_EMOJI}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span>{PROGRESS_TITLE}</span>
          <span
            className="kb-tag kb-mint"
            style={{ fontSize: 11, width: 'fit-content' }}
          >
            今日已打卡 ✨
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
        <div className="kb-bar-track" style={{ flex: 1 }}>
          <div
            className="kb-bar-fill"
            style={{
              width: `${progressVal}%`,
              background: `linear-gradient(90deg, ${PROGRESS_COLOR}, var(--blush))`,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          {isMobile ? (
            <input
              type="number"
              min={0}
              max={100}
              value={displayValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                handleContentChange(e.target.value);
              }}
              onFocus={(): void => setIsEditing(true)}
              onBlur={handleBlur}
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--ink-1)',
                lineHeight: 1,
                outline: 'none',
                minWidth: 48,
                textAlign: 'right',
                width: 60,
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <div
              ref={editableRef}
              contentEditable
              onInput={(e: React.FormEvent<HTMLDivElement>): void => {
                handleContentChange(e.currentTarget.innerText);
              }}
              onCompositionStart={(): void => {
                composingRef.current = true;
                setIsEditing(true);
              }}
              onCompositionEnd={(e: React.FormEvent<HTMLDivElement>): void => {
                composingRef.current = false;
                handleContentChange(e.currentTarget.innerText);
              }}
              onFocus={(): void => setIsEditing(true)}
              onBlur={handleBlur}
              onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--ink-1)',
                lineHeight: 1,
                outline: 'none',
                minWidth: 48,
                textAlign: 'right',
              }}
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(serverContent) }}
              key={`progress-${serverDataLoaded ? 'loaded' : 'pending'}`}
            />
          )}
          <span style={{ fontSize: 13, color: '#A63F60', fontWeight: 700 }}>%</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11.5,
          color: 'var(--ink-3)',
          fontWeight: 600,
        }}
      >
        <span>第 1 天</span>
        <span>第 45 天</span>
        <span>第 90 天</span>
      </div>

      <div className="kb-edit-hint">
        <Edit3 size={12} />
        点击数字编辑
      </div>
    </div>
  );
};

export default ProgressCard;

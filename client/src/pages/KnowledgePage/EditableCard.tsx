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

export interface EditableCardProps {
  sectionKey: string;
  title: string;
  emoji: string;
  color: string;
  tag?: string;
}

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

const EditableCard: React.FC<EditableCardProps> = ({
  sectionKey,
  title,
  emoji,
  color,
  tag,
}) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [editingValue, setEditingValue] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const composingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editableRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const cardsQuery = useCardsQuery();
  const updateCardMutation = useUpdateCardMutation();
  const isMobile = useIsMobile();

  const cards: CardContent[] = cardsQuery.data ?? [];
  const serverDataLoaded = cardsQuery.isSuccess && cards.length > 0;

  const serverContent = useMemo((): string => {
    const card = cards.find((c: CardContent): boolean => c.sectionKey === sectionKey);
    return card?.content ?? '';
  }, [cards, sectionKey]);

  const displayContent = editingValue !== undefined ? editingValue : serverContent;

  const saveCard = useCallback(
    (content: string): void => {
      setSaveStatus('saving');
      updateCardMutation.mutate(
        { sectionKey, content },
        {
          onSuccess: (): void => {
            setEditingValue(undefined);
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
    [sectionKey, updateCardMutation],
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
    (value: string): void => {
      if (composingRef.current) return;
      setEditingValue(value);
      scheduleSave(value);
    },
    [scheduleSave],
  );

  const handleBlur = useCallback((): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const currentContent =
      editingValue !== undefined
        ? editingValue
        : editableRef.current?.innerText ?? textareaRef.current?.value ?? '';
    void saveCard(currentContent);
    setIsEditing(false);
    composingRef.current = false;
  }, [saveCard, editingValue]);

  // Sync server content to DOM when loaded (for contentEditable)
  useEffect(() => {
    if (!serverDataLoaded) return;
    if (isEditing) return;
    if (editableRef.current && editableRef.current.innerText !== serverContent) {
      editableRef.current.innerText = serverContent;
    }
  }, [serverDataLoaded, serverContent, isEditing]);

  // Flush pending save on unload
  useEffect(() => {
    const flushPending = (): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (editingValue !== undefined) {
        void knowledgeApi.updateCard(sectionKey, editingValue).catch((err): void => {
          logger.error('离开页面前保存失败', err);
        });
      }
    };
    window.addEventListener('beforeunload', flushPending);
    window.addEventListener('pagehide', flushPending);
    return (): void => {
      window.removeEventListener('beforeunload', flushPending);
      window.removeEventListener('pagehide', flushPending);
    };
  }, [editingValue, sectionKey]);

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
      <div
        className="kb-card kb-jelly"
        style={{ '--_c': color } as React.CSSProperties}
      >
        <div className="kb-card-title">
          <div className="kb-icon" style={{ background: color }}>
            <span style={{ fontSize: '1.1em' }}>{emoji}</span>
          </div>
          <span>{title}</span>
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 13, minHeight: 68 }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div
      className="kb-card kb-jelly"
      style={{ '--_c': color } as React.CSSProperties}
    >
      {renderSaveIndicator()}
      <div className="kb-card-title">
        <div className="kb-icon" style={{ background: color }}>
          <span style={{ fontSize: '1.1em' }}>{emoji}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span>{title}</span>
          {tag && (
            <span
              className="kb-tag kb-mint"
              style={{ fontSize: 11, width: 'fit-content' }}
            >
              {tag}
            </span>
          )}
        </div>
      </div>

      {isMobile ? (
        <textarea
          ref={textareaRef}
          value={displayContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => {
            if (composingRef.current) return;
            handleContentChange(e.target.value);
          }}
          onCompositionStart={(): void => {
            composingRef.current = true;
            setIsEditing(true);
          }}
          onCompositionEnd={(e: React.CompositionEvent<HTMLTextAreaElement>): void => {
            composingRef.current = false;
            handleContentChange(e.currentTarget.value);
          }}
          onFocus={(): void => setIsEditing(true)}
          onBlur={handleBlur}
          placeholder="点一下，写点什么吧～"
          className="w-full bg-transparent outline-none resize-none text-sm"
          style={{
            color: 'var(--ink-2)',
            minHeight: 68,
            lineHeight: 1.75,
            padding: 0,
            border: 'none',
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
      ) : (
        <div
          key={`${sectionKey}-${serverDataLoaded ? 'loaded' : 'pending'}`}
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e: React.FormEvent<HTMLDivElement>): void => {
            if (composingRef.current) return;
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
          data-placeholder="点一下，写点什么吧～"
          className="text-sm leading-relaxed outline-none focus:outline-none cursor-text whitespace-pre-wrap break-words"
          style={{ color: 'var(--ink-2)', minHeight: 68, lineHeight: 1.75 }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(serverContent) }}
        />
      )}

      <div className="kb-edit-hint">
        <Edit3 size={12} />
        点我编辑
      </div>
    </div>
  );
};

export default EditableCard;

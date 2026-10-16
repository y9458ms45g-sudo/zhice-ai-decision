import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Check, Loader2, Edit3 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CardContent } from '@shared/api.interface';
import { knowledgeApi } from '@client/src/api';
import ActionTasksList from './ActionTasksList';
import {
  useCardsQuery,
  useUpdateCardMutation,
} from './useKnowledgeData';

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

type SaveStatus = 'idle' | 'saving' | 'saved';

interface CardConfig {
  sectionKey: string;
  title: string;
  emoji: string;
  color: string;
  tag?: string;
}

interface SectionConfig {
  sectionId: string;
  title: string;
  emoji: string;
  num: string;
  numColor: string;
  cards: CardConfig[];
  gridClass: string;
}

const SECTIONS: SectionConfig[] = [
  {
    sectionId: 'strategy',
    title: '核心战略',
    emoji: '🚀',
    num: '01',
    numColor: 'linear-gradient(135deg, #FFE7A8, #FFD36B)',
    gridClass: 'grid-cols-1 md:grid-cols-3',
    cards: [
      { sectionKey: 'strategy_phase1', title: '第1阶段', emoji: '🌱', color: 'var(--butter)', tag: 'seed' },
      { sectionKey: 'strategy_phase2', title: '第2阶段', emoji: '🌿', color: 'var(--peach)', tag: 'grow' },
      { sectionKey: 'strategy_phase3', title: '第3阶段', emoji: '🌳', color: 'var(--mint)', tag: 'bloom' },
    ],
  },
  {
    sectionId: 'monetize',
    title: '快速变现方向',
    emoji: '💰',
    num: '02',
    numColor: 'linear-gradient(135deg, #FFD2B5, #FFAE81)',
    gridClass: 'grid-cols-1 md:grid-cols-3',
    cards: [
      { sectionKey: 'monetize_novel', title: 'AIGC小说', emoji: '📖', color: 'var(--blush-d)', tag: 'AIGC' },
      { sectionKey: 'monetize_editing', title: '剪辑接单', emoji: '🎬', color: 'var(--blush)', tag: 'video' },
      { sectionKey: 'monetize_media', title: '自媒体', emoji: '📱', color: 'var(--powder)', tag: 'content' },
    ],
  },
];

export const PROGRESS_SECTION_ID = 'action';

const PROGRESS_CARD: CardConfig = {
  sectionKey: 'progress_90days',
  title: '90天行动进度',
  emoji: '⏳',
  color: 'var(--mint-d)',
};

const InfoSection: React.FC = () => {
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [progressVal, setProgressVal] = useState<number>(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const composingRef = useRef<Set<string>>(new Set());
  const lastEditTimeRef = useRef<Map<string, number>>(new Map());
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const editableRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const cardsQuery = useCardsQuery();
  const updateCardMutation = useUpdateCardMutation();
  const isMobile = useIsMobile();
  const cards: CardContent[] = cardsQuery.data ?? [];
  const loading = cardsQuery.isLoading || cardsQuery.isFetching;
  const serverDataLoaded = cardsQuery.isSuccess && cards.length > 0;

  const cardContentMap = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((c: CardContent): void => {
      map.set(c.sectionKey, c.content ?? '');
    });
    return map;
  }, [cards]);

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const getCardContent = useCallback(
    (sectionKey: string): string => {
      if (editingValues[sectionKey] !== undefined) {
        return editingValues[sectionKey];
      }
      return cardContentMap.get(sectionKey) ?? '';
    },
    [cardContentMap, editingValues],
  );

  const setSaveStatus = useCallback((key: string, status: SaveStatus): void => {
    setSaveStatuses((prev: Record<string, SaveStatus>): Record<string, SaveStatus> => ({
      ...prev,
      [key]: status,
    }));
  }, []);

  const saveCard = useCallback(
    (sectionKey: string, content: string): void => {
      setSaveStatus(sectionKey, 'saving');
      lastEditTimeRef.current.set(sectionKey, Date.now());
      updateCardMutation.mutate(
        { sectionKey, content },
        {
          onSuccess: (result): void => {
            setEditingValues((prev: Record<string, string>): Record<string, string> => {
              const next = { ...prev };
              delete next[sectionKey];
              return next;
            });
            if (sectionKey === PROGRESS_CARD.sectionKey) {
              const n = Math.max(0, Math.min(100, Number(result.content) || 0));
              setProgressVal(n);
            }
            setSaveStatus(sectionKey, 'saved');
            setTimeout((): void => {
              setSaveStatus(sectionKey, 'idle');
            }, 1500);
          },
          onError: (): void => {
            setSaveStatus(sectionKey, 'idle');
          },
        },
      );
    },
    [setSaveStatus, updateCardMutation],
  );

  const scheduleSave = useCallback(
    (sectionKey: string, content: string): void => {
      const timers = debounceTimersRef.current;
      const existing = timers.get(sectionKey);
      if (existing) clearTimeout(existing);

      const timer = setTimeout((): void => {
        void saveCard(sectionKey, content);
        timers.delete(sectionKey);
      }, 500);
      timers.set(sectionKey, timer);
    },
    [saveCard],
  );

  const handleContentChange = useCallback(
    (sectionKey: string, value: string): void => {
      if (composingRef.current.has(sectionKey)) return;
      setEditingValues((prev: Record<string, string>): Record<string, string> => ({
        ...prev,
        [sectionKey]: value,
      }));
      if (sectionKey === PROGRESS_CARD.sectionKey) {
        const n = Math.max(0, Math.min(100, Number(value) || 0));
        setProgressVal(n);
      }
      lastEditTimeRef.current.set(sectionKey, Date.now());
      scheduleSave(sectionKey, value);
    },
    [scheduleSave],
  );

  const handleBlur = useCallback(
    (sectionKey: string): void => {
      const timers = debounceTimersRef.current;
      const existing = timers.get(sectionKey);
      if (existing) {
        clearTimeout(existing);
        timers.delete(sectionKey);
      }
      const el = editableRefs.current.get(sectionKey);
      const editingVal = editingValues[sectionKey];
      const currentContent = editingVal !== undefined ? editingVal : el?.innerText ?? '';
      void saveCard(sectionKey, currentContent);
      setEditingKey(null);
    },
    [saveCard, editingValues],
  );

  useEffect(() => {
    if (!serverDataLoaded) return;
    cards.forEach((card: CardContent): void => {
      const el = editableRefs.current.get(card.sectionKey);
      if (el && el.innerText !== card.content) {
        el.innerText = card.content ?? '';
      }
    });
    const progressEl = editableRefs.current.get(PROGRESS_CARD.sectionKey);
    const progressContent = cardContentMap.get(PROGRESS_CARD.sectionKey) ?? '';
    if (progressEl && progressEl.innerText !== progressContent) {
      progressEl.innerText = progressContent;
    }
  }, [serverDataLoaded, cards, cardContentMap]);

  useEffect(() => {
    if (!cardsQuery.data) return;
    const progressCard = cards.find(
      (c: CardContent): boolean => c.sectionKey === PROGRESS_CARD.sectionKey,
    );
    if (progressCard) {
      const n = Math.max(0, Math.min(100, Number(progressCard.content) || 0));
      setProgressVal(n);
    }
  }, [cards, cardsQuery.data]);

  useEffect(() => {
    const flushPending = (): void => {
      const timers = debounceTimersRef.current;
      const keys = Array.from(timers.keys());
      for (const key of keys) {
        const timer = timers.get(key);
        if (timer) {
          clearTimeout(timer);
          timers.delete(key);
        }
        const content = editingValues[key] ?? cardContentMap.get(key) ?? '';
        void knowledgeApi.updateCard(key, content).catch((err): void => {
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
  }, [editingValues, cardContentMap]);

  const setEditableRef = useCallback((sectionKey: string, el: HTMLDivElement | null): void => {
    editableRefs.current.set(sectionKey, el);
  }, []);

  if (loading) {
    return (
      <div className="w-full py-20 flex items-center justify-center">
        <div className="text-pink-400 text-base">加载中...</div>
      </div>
    );
  }

  const renderSaveIndicator = (sectionKey: string): React.ReactNode => {
    const status = saveStatuses[sectionKey];
    if (status === 'saving') {
      return (
        <span className="kb-save-status">
          <Loader2 size={12} />
          保存中
        </span>
      );
    }
    if (status === 'saved') {
      return (
        <span className="kb-save-status" style={{ color: '#2F6B57' }}>
          <Check size={12} />
          已保存
        </span>
      );
    }
    return null;
  };

  const renderTextCard = (card: CardConfig): React.ReactNode => {
    const content = getCardContent(card.sectionKey);
    const isEditing = editingValues[card.sectionKey] !== undefined;
    const displayContent = isEditing ? editingValues[card.sectionKey] : content;

    return (
      <div
        key={card.sectionKey}
        className="kb-card kb-jelly"
        style={{ '--_c': card.color } as React.CSSProperties}
      >
        {renderSaveIndicator(card.sectionKey)}
        <div className="kb-card-title">
          <div className="kb-icon" style={{ background: card.color }}>
            <span style={{ fontSize: '1.1em' }}>{card.emoji}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>{card.title}</span>
          </div>
        </div>
         {isMobile ? (
           <textarea
             value={displayContent}
             onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => {
               if (composingRef.current.has(card.sectionKey)) return;
               handleContentChange(card.sectionKey, e.target.value);
             }}
             onCompositionStart={(): void => {
               composingRef.current.add(card.sectionKey);
               setEditingKey(card.sectionKey);
             }}
             onCompositionEnd={(e: React.CompositionEvent<HTMLTextAreaElement>): void => {
               composingRef.current.delete(card.sectionKey);
               handleContentChange(card.sectionKey, e.currentTarget.value);
             }}
             onFocus={(): void => {
               setEditingKey(card.sectionKey);
             }}
             onBlur={(): void => {
               composingRef.current.delete(card.sectionKey);
               handleBlur(card.sectionKey);
             }}
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
            key={`${card.sectionKey}-${serverDataLoaded ? 'loaded' : 'pending'}`}
            ref={(el): void => setEditableRef(card.sectionKey, el)}
            contentEditable
            suppressContentEditableWarning
            onInput={(e: React.FormEvent<HTMLDivElement>): void => {
              if (composingRef.current.has(card.sectionKey)) return;
              handleContentChange(card.sectionKey, e.currentTarget.innerText);
            }}
            onCompositionStart={(): void => {
              composingRef.current.add(card.sectionKey);
              setEditingKey(card.sectionKey);
            }}
            onCompositionEnd={(e: React.FormEvent<HTMLDivElement>): void => {
              composingRef.current.delete(card.sectionKey);
              handleContentChange(card.sectionKey, e.currentTarget.innerText);
            }}
            onFocus={(): void => {
              setEditingKey(card.sectionKey);
            }}
            onBlur={(): void => {
              composingRef.current.delete(card.sectionKey);
              handleBlur(card.sectionKey);
            }}
            data-placeholder="点一下，写点什么吧～"
            className="text-sm leading-relaxed outline-none focus:outline-none cursor-text whitespace-pre-wrap break-words"
            style={{ color: 'var(--ink-2)', minHeight: 68, lineHeight: 1.75 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getCardContent(card.sectionKey)) }}
          />
        )}
        <div className="kb-edit-hint">
          <Edit3 size={12} />
          点我编辑
        </div>
      </div>
    );
  };

  const renderProgressCard = (): React.ReactNode => {
    return (
      <div key={PROGRESS_CARD.sectionKey} className="kb-card kb-jelly">
        {renderSaveIndicator(PROGRESS_CARD.sectionKey)}
        <div className="kb-card-title">
          <div className="kb-icon" style={{ background: PROGRESS_CARD.color }}>
            <span style={{ fontSize: '1.1em' }}>{PROGRESS_CARD.emoji}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>{PROGRESS_CARD.title}</span>
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
                background: `linear-gradient(90deg, ${PROGRESS_CARD.color}, var(--blush))`,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            {isMobile ? (
              <input
                type="number"
                min={0}
                max={100}
                value={editingValues[PROGRESS_CARD.sectionKey] ?? getCardContent(PROGRESS_CARD.sectionKey)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  handleContentChange(PROGRESS_CARD.sectionKey, val || '0');
                }}
                onFocus={(): void => {
                  setEditingKey(PROGRESS_CARD.sectionKey);
                }}
                onBlur={(): void => {
                  handleBlur(PROGRESS_CARD.sectionKey);
                }}
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
                ref={(el): void => setEditableRef(PROGRESS_CARD.sectionKey, el)}
                contentEditable
                onInput={(e: React.FormEvent<HTMLDivElement>): void => {
                  const raw = e.currentTarget.innerText;
                  const val = raw.replace(/[^\d]/g, '');
                  handleContentChange(PROGRESS_CARD.sectionKey, val || '0');
                }}
                onCompositionStart={(): void => {
                  composingRef.current.add(PROGRESS_CARD.sectionKey);
                  setEditingKey(PROGRESS_CARD.sectionKey);
                }}
                onCompositionEnd={(e: React.FormEvent<HTMLDivElement>): void => {
                  composingRef.current.delete(PROGRESS_CARD.sectionKey);
                  const raw = e.currentTarget.innerText;
                  const val = raw.replace(/[^\d]/g, '');
                  handleContentChange(PROGRESS_CARD.sectionKey, val || '0');
                }}
                onFocus={(): void => {
                  setEditingKey(PROGRESS_CARD.sectionKey);
                }}
                onBlur={(): void => {
                  composingRef.current.delete(PROGRESS_CARD.sectionKey);
                  handleBlur(PROGRESS_CARD.sectionKey);
                }}
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
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getCardContent(PROGRESS_CARD.sectionKey)) }}
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
      </div>
    );
  };

  const renderSectionHead = (section: SectionConfig): React.ReactNode => (
    <div className="kb-section-head">
      <span className="kb-section-num" style={{ background: section.numColor }}>
        {section.num} / {section.emoji}
      </span>
      <h2 style={{ margin: 0 }}>{section.title}</h2>
      <svg
        className="kb-sh-deco"
        viewBox="0 0 120 84"
        aria-hidden="true"
      >
        <use href="#i-bow" />
      </svg>
    </div>
  );

  return (
    <section className="kb-info-section">
      {SECTIONS.slice(0, 3).map((section: SectionConfig, idx: number): React.ReactNode => (
        <div key={section.sectionId}>
          {idx > 0 && (
            <div className="kb-lace-divider" style={{ marginBottom: 28, marginTop: 20 }}>
              <span className="kb-ld-line" />
              <svg
                className="kb-ld-icon kb-sm"
                viewBox="0 0 120 84"
                aria-hidden="true"
              >
                <use href="#i-bow" />
              </svg>
              <span className="kb-ld-line" />
            </div>
          )}
          <div
            id={section.sectionId}
            className="flex flex-col gap-5 scroll-mt-24"
          >
            {renderSectionHead(section)}
            <div className={`grid ${section.gridClass} gap-5`}>
              {section.cards.map((card: CardConfig): React.ReactNode =>
                renderTextCard(card),
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="kb-lace-divider" style={{ marginBottom: 28, marginTop: 24 }}>
        <span className="kb-ld-line" />
        <svg
          className="kb-ld-icon"
          viewBox="0 0 120 84"
          aria-hidden="true"
          style={{ color: 'var(--mint)' }}
        >
          <use href="#i-bow" />
        </svg>
        <span className="kb-ld-line" />
      </div>

      <div
        id={PROGRESS_SECTION_ID}
        className="flex flex-col gap-5 scroll-mt-24"
      >
        <div className="kb-section-head">
          <span
            className="kb-section-num"
            style={{ background: 'linear-gradient(135deg, #B9E7D4, #84D3B6)' }}
          >
            03 / 📊
          </span>
          <h2 style={{ margin: 0 }}>90天行动进度</h2>
          <svg
            className="kb-sh-deco"
            viewBox="0 0 120 84"
            aria-hidden="true"
            style={{ color: 'var(--mint)' }}
          >
            <use href="#i-bow" />
          </svg>
        </div>
        {renderProgressCard()}
        <ActionTasksList />
      </div>

       {SECTIONS.slice(3).map((section: SectionConfig): React.ReactNode => (
        <div key={section.sectionId}>
          <div
            id={section.sectionId}
            className="flex flex-col gap-5 scroll-mt-24"
          >
            {renderSectionHead(section)}
            <div className={`grid ${section.gridClass} gap-5`}>
              {section.cards.map((card: CardConfig): React.ReactNode =>
                renderTextCard(card),
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default InfoSection;

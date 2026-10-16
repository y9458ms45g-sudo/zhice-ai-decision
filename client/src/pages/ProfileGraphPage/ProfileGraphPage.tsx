import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Star, ChevronRight, X } from 'lucide-react';
import { getProfileGraph } from '@client/src/api/knowledge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ProfileCard, ProfileStageData, ProfileStage } from '@shared/api.interface';
import TopNav from '../KnowledgePage/components/TopNav';
import { ThemeProvider } from '../KnowledgePage/ThemeContext';
import '../KnowledgePage/knowledge-coquette.css';

const ProfileGraphPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile-graph'],
    queryFn: getProfileGraph,
  });

  const [activeStage, setActiveStage] = useState<ProfileStage>('foundation');
  const [selectedCard, setSelectedCard] = useState<ProfileCard | null>(null);

  if (error) {
    logger.error('综合画像加载失败', error);
  }

  const handleScrollToSection = (): void => {};

  const activeStageData = useMemo(() => {
    if (!data?.stages) return null;
    return data.stages.find((s: ProfileStageData): boolean => s.stage === activeStage) ?? null;
  }, [data, activeStage]);

  const renderStars = (count: number, max = 5): React.ReactNode => {
    const stars: React.ReactNode[] = [];
    for (let i = 0; i < max; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          fill={i < count ? '#FFB84D' : 'transparent'}
          stroke={i < count ? '#FFB84D' : '#E5D9EC'}
        />,
      );
    }
    return stars;
  };

  const stripProficiencyLine = (content: string): string => {
    return content.replace(/\n*熟练度[：:].*\n?/g, '').trim();
  };

  return (
    <ThemeProvider>
      <div
        className="kb-page kb-theme-light"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FFF6EC 0%, #FFF1F4 50%, #F5F1FF 100%)',
          paddingBottom: 60,
        }}
      >
        <TopNav onScrollToSection={handleScrollToSection} mode="navigate" />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Sparkles size={24} color="#FF9DBB" />
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#4A3B52', margin: 0 }}>
                综合画像图谱
              </h1>
            </div>
            <p style={{ color: '#9B8AA6', margin: 0, fontSize: 14 }}>
              从基础能力到专业深耕，你的成长路线图 ✨
            </p>
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#B8A5C4' }}>
              加载中...
            </div>
          )}

          {error && (
            <div
              className="kb-jelly"
              style={{
                padding: 24,
                textAlign: 'center',
                color: '#E88BA5',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 24,
              }}
            >
              加载失败，请稍后重试
            </div>
          )}

          {data?.stages && !isLoading && !error && (
            <div
              style={{
                display: 'flex',
                gap: 32,
                flexDirection: 'row',
              }}
              className="profile-graph-container"
            >
              <div
                style={{
                  flex: '0 0 220px',
                  position: 'relative',
                  paddingTop: 20,
                  paddingBottom: 20,
                }}
                className="profile-timeline-col"
              >
                <svg
                  width="100%"
                  height="100%"
                  style={{
                    position: 'absolute',
                    left: 24,
                    top: 0,
                    width: 3,
                    pointerEvents: 'none',
                  }}
                  className="profile-timeline-line-svg"
                  preserveAspectRatio="none"
                  viewBox="0 0 3 100"
                >
                  <defs>
                    <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFC9DE" />
                      <stop offset="50%" stopColor="#DCC9F7" />
                      <stop offset="100%" stopColor="#FFE7A8" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 1.5 0 Q 4 25 1.5 50 Q -1 75 1.5 100"
                    stroke="url(#timelineGrad)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 48, position: 'relative', zIndex: 1 }}>
                  {data.stages.map((stage: ProfileStageData, idx: number): React.ReactNode => (
                    <button
                      key={stage.stage}
                      onClick={(): void => setActiveStage(stage.stage)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: stage.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                          boxShadow: activeStage === stage.stage
                            ? '0 4px 16px rgba(255, 157, 187, 0.4), inset 0 2px 4px rgba(255,255,255,0.6)'
                            : '0 2px 8px rgba(255, 180, 200, 0.2), inset 0 2px 4px rgba(255,255,255,0.6)',
                          border: activeStage === stage.stage
                            ? '3px solid white'
                            : '3px solid rgba(255,255,255,0.7)',
                          transition: 'all 0.3s ease',
                          transform: activeStage === stage.stage ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {stage.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#B8A5C4',
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          阶段 {idx + 1}
                        </div>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: activeStage === stage.stage ? '#4A3B52' : '#7A6B85',
                            transition: 'color 0.3s ease',
                          }}
                        >
                          {stage.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#B8A5C4', marginTop: 2 }}>
                          {stage.cards.length} 项能力
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        color={activeStage === stage.stage ? '#FF9DBB' : '#D4C7DD'}
                        style={{
                          opacity: activeStage === stage.stage ? 1 : 0.5,
                          transform: activeStage === stage.stage ? 'translateX(0)' : 'translateX(-4px)',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {activeStageData && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: activeStageData.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6)',
                        }}
                      >
                        {activeStageData.emoji}
                      </div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#4A3B52', margin: 0 }}>
                        {activeStageData.label}
                      </h2>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#B8A5C4',
                          background: 'rgba(255,255,255,0.6)',
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.8)',
                        }}
                      >
                        {activeStageData.cards.length} 张卡片
                      </span>
                    </div>

                    {activeStageData.cards.length === 0 ? (
                      <div
                        className="kb-jelly"
                        style={{
                          padding: '48px 24px',
                          textAlign: 'center',
                          background: 'rgba(255,255,255,0.6)',
                          borderRadius: 24,
                          color: '#B8A5C4',
                        }}
                      >
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#7A6B85', marginBottom: 4 }}>
                          待规划
                        </div>
                        <div style={{ fontSize: 13 }}>
                          未来方向正在探索中，敬请期待～
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: 20,
                        }}
                        className="profile-cards-grid"
                      >
                        {activeStageData.cards.map((card: ProfileCard): React.ReactNode => (
                          <button
                            key={card.sectionKey}
                            onClick={(): void => setSelectedCard(card)}
                            className="kb-card kb-jelly profile-card"
                            style={{
                              background: 'rgba(255,255,255,0.75)',
                              borderRadius: 28,
                              padding: 24,
                              textAlign: 'left',
                              cursor: 'pointer',
                              border: 'none',
                              position: 'relative',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            <svg
                              className="kb-sh-deco"
                              viewBox="0 0 120 84"
                              style={{
                                position: 'absolute',
                                top: -2,
                                right: 16,
                                width: 32,
                                height: 24,
                                opacity: 0.9,
                              }}
                              aria-hidden="true"
                            >
                              <use href="#i-bow" />
                            </svg>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                              <div
                                className="kb-icon"
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 14,
                                  background: card.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 20,
                                  flexShrink: 0,
                                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.05)',
                                }}
                              >
                                {card.emoji}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: 17,
                                    fontWeight: 700,
                                    color: '#4A3B52',
                                    marginBottom: 2,
                                  }}
                                >
                                  {card.title}
                                </div>
                                {card.proficiency !== undefined && (
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    {renderStars(card.proficiency)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: 13,
                                lineHeight: 1.7,
                                color: '#7A6B85',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {stripProficiencyLine(card.content)}
                            </div>

                            <div
                              style={{
                                marginTop: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                color: '#FF9DBB',
                                fontWeight: 600,
                              }}
                            >
                              <span>查看详情</span>
                              <ChevronRight size={14} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedCard && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(74, 59, 82, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={(): void => setSelectedCard(null)}
          >
            <div
              className="kb-jelly"
              style={{
                background: 'white',
                borderRadius: 32,
                padding: 32,
                maxWidth: 480,
                width: '100%',
                position: 'relative',
                boxShadow: '0 20px 60px rgba(74, 59, 82, 0.25)',
              }}
              onClick={(e: React.MouseEvent): void => e.stopPropagation()}
            >
              <button
                onClick={(): void => setSelectedCard(null)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#FFF0F5',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#E88BA5',
                }}
                aria-label="关闭"
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 20,
                    background: selectedCard.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.7), 0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  {selectedCard.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#4A3B52', marginBottom: 4 }}>
                    {selectedCard.title}
                  </div>
                  {selectedCard.proficiency !== undefined && (
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#9B8AA6', marginRight: 4 }}>熟练度：</span>
                      {renderStars(selectedCard.proficiency)}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: '#5A4B65',
                  background: '#FFFAFC',
                  borderRadius: 20,
                  padding: 20,
                  border: '1px solid #FFE8F0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {stripProficiencyLine(selectedCard.content) || '待完善'}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .profile-graph-container {
            flex-direction: column !important;
            gap: 24px !important;
          }
          .profile-timeline-col {
            flex: none !important;
            width: 100% !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            overflow-x: auto;
            overflow-y: hidden;
          }
          .profile-timeline-col > div:first-child {
            display: none !important;
          }
          .profile-timeline-col > div:last-child {
            flex-direction: row !important;
            gap: 12px !important;
            overflow-x: auto;
            padding-bottom: 8px;
          }
          .profile-timeline-col > div:last-child > button {
            flex-direction: column !important;
            align-items: center !important;
            gap: 6px !important;
            flex: 0 0 auto;
            width: 80px !important;
            text-align: center !important;
          }
          .profile-timeline-col > div:last-child > button > div:last-child {
            display: none !important;
          }
          .profile-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </ThemeProvider>
  );
};

export default ProfileGraphPage;

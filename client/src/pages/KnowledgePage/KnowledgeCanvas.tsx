import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Plus, ZoomIn, ZoomOut, Maximize2, Shuffle } from 'lucide-react';
import type { KnowledgeNode, KnowledgeEdge } from '@shared/api.interface';
import { useTheme } from './ThemeContext';
import { mapNodeColor } from './theme';

interface KnowledgeCanvasProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onEditNode: (id: string) => void;
  onAddNode: (x: number, y: number) => void;
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onScrollDown?: () => void;
  visible?: boolean;
}

interface Transform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface DragState {
  isDragging: boolean;
  isNodeDrag: boolean;
  draggedNodeId: string | null;
  startX: number;
  startY: number;
  nodeStartX: number;
  nodeStartY: number;
  offsetStartX: number;
  offsetStartY: number;
  moved: boolean;
}

interface AnimNode {
  id: string;
  sx: number;
  sy: number;
  svx: number;
  svy: number;
  hov: number;
  sel: number;
  seed: number;
}

interface Signal {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  speed: number;
  color: string;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  a: number;
  speed: number;
  color: string;
}

const NODE_RADIUS = 36;
const CENTER_NODE_RADIUS = 52;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const WHEEL_ZOOM_FACTOR = 0.0025;
const EDGE_HIT_THRESHOLD = 20;
const UI_FONT =
  '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif';
const EMOJI_FONT =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Noto Color Emoji Compat","Android Emoji","EmojiSymbols","Twemoji Mozilla","JoyPixels",system-ui,sans-serif';

function getIconFont(): string {
  return EMOJI_FONT;
}

const PORTRAIT_LAYOUT: Record<string, { x: number; y: number }> = {
  '我': { x: 0, y: 0 },
  '土豆': { x: 130, y: -80 },
  '个人技能': { x: -130, y: -80 },
  '新闻学': { x: -150, y: 90 },
  '内容运营': { x: 150, y: 90 },
  '生存约束': { x: 0, y: 160 },
  'AIGC小说': { x: -150, y: -180 },
  'FED前端': { x: 150, y: -180 },
  '自媒体': { x: -70, y: 240 },
  '剪辑接单': { x: 70, y: 240 },
  '后端开发': { x: -120, y: -290 },
  '深度全栈': { x: 0, y: -320 },
  'AI产品经理': { x: 120, y: -290 },
};

function buildLayout(source: KnowledgeNode[], isPortrait: boolean): KnowledgeNode[] {
  if (!isPortrait || source.length === 0) return source;

  const nameToNode = new Map<string, KnowledgeNode>();
  source.forEach((n: KnowledgeNode): void => {
    nameToNode.set(n.name, { ...n });
  });

  const matched: KnowledgeNode[] = [];
  const unmatched: KnowledgeNode[] = [];

  nameToNode.forEach((node: KnowledgeNode): void => {
    const pos = PORTRAIT_LAYOUT[node.name];
    if (pos) {
      matched.push({
        ...node,
        x: pos.x,
        y: pos.y,
      });
    } else {
      unmatched.push({ ...node });
    }
  });

  const result = [...matched];
  if (unmatched.length > 0) {
    const gap = 80;
    const totalW = (unmatched.length - 1) * gap;
    const startX = -totalW / 2;
    const baseY = 220;
    unmatched.forEach((node: KnowledgeNode, i: number): void => {
      result.push({
        ...node,
        x: startX + i * gap,
        y: baseY,
      });
    });
  }

  return result;
}

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const KnowledgeCanvas: React.FC<KnowledgeCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onEditNode,
  onAddNode,
  onNodePositionChange,
  onScrollDown,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const transformRef = useRef<Transform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const dragRef = useRef<DragState>({
    isDragging: false,
    isNodeDrag: false,
    draggedNodeId: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
    offsetStartX: 0,
    offsetStartY: 0,
    moved: false,
  });
  const nodesRef = useRef<KnowledgeNode[]>(nodes);
  const edgesRef = useRef<KnowledgeEdge[]>(edges);
  const selectedRef = useRef<string | null>(selectedNodeId);
  const animationRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickNodeRef = useRef<string | null>(null);
  const fittedRef = useRef<boolean>(false);
  const canvasSizedRef = useRef<boolean>(false);
  const layoutNodesRef = useRef<KnowledgeNode[]>([]);
  const pinchRef = useRef<{
    active: boolean;
    lastDist: number;
    lastMidX: number;
    lastMidY: number;
  }>({ active: false, lastDist: 0, lastMidX: 0, lastMidY: 0 });
  const animNodesRef = useRef<Map<string, AnimNode>>(new Map());
  const signalsRef = useRef<Signal[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastTimeRef = useRef<number>(0);
  const visibleRef = useRef<boolean>(visible);
  const [displayScale, setDisplayScale] = useState<number>(1);

  useEffect(() => {
    nodesRef.current = nodes;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const isPortrait = rect.width > 0 && rect.width < 768;
      layoutNodesRef.current = buildLayout(nodes, isPortrait);
    } else {
      layoutNodesRef.current = nodes;
    }
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    selectedRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const getNodeRadius = useCallback((node: KnowledgeNode): number => {
    return node.isCenter ? CENTER_NODE_RADIUS : NODE_RADIUS;
  }, []);

  const getAnimNode = useCallback((node: KnowledgeNode): AnimNode => {
    const map = animNodesRef.current;
    let a = map.get(node.id);
    if (!a) {
      a = {
        id: node.id,
        sx: 1,
        sy: 1,
        svx: 0,
        svy: 0,
        hov: 0,
        sel: 0,
        seed: Math.random() * Math.PI * 2,
      };
      map.set(node.id, a);
    }
    return a;
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number): { x: number; y: number } => {
    const t = transformRef.current;
    return {
      x: (sx - t.offsetX) / t.scale,
      y: (sy - t.offsetY) / t.scale,
    };
  }, []);

  const hitTestNode = useCallback(
    (sx: number, sy: number): KnowledgeNode | null => {
      const { x: wx, y: wy } = screenToWorld(sx, sy);
      const currentNodes = layoutNodesRef.current;
      for (let i = currentNodes.length - 1; i >= 0; i--) {
        const node = currentNodes[i];
        const r = getNodeRadius(node);
        const dx = wx - node.x;
        const dy = wy - node.y;
        if (dx * dx + dy * dy <= r * r) {
          return node;
        }
      }
      return null;
    },
    [screenToWorld, getNodeRadius],
  );

  const hitTestEdge = useCallback(
    (sx: number, sy: number): boolean => {
      const { x: wx, y: wy } = screenToWorld(sx, sy);
      const currentNodes = layoutNodesRef.current;
      const currentEdges = edgesRef.current;
      const nodeMap = new Map<string, KnowledgeNode>();
      for (const n of currentNodes) nodeMap.set(n.id, n);
      const threshold = EDGE_HIT_THRESHOLD / transformRef.current.scale;
      const thresholdSq = threshold * threshold;
      for (const edge of currentEdges) {
        const from = nodeMap.get(edge.fromNode);
        const to = nodeMap.get(edge.toNode);
        if (!from || !to) continue;
        const ax = from.x;
        const ay = from.y;
        const bx = to.x;
        const by = to.y;
        const abx = bx - ax;
        const aby = by - ay;
        const apx = wx - ax;
        const apy = wy - ay;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0) continue;
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + abx * t;
        const cy = ay + aby * t;
        const dx = wx - cx;
        const dy = wy - cy;
        if (dx * dx + dy * dy <= thresholdSq) {
          return true;
        }
      }
      return false;
    },
    [screenToWorld],
  );

  const hitTestGraph = useCallback(
    (sx: number, sy: number): boolean => {
      if (hitTestNode(sx, sy)) return true;
      return hitTestEdge(sx, sy);
    },
    [hitTestNode, hitTestEdge],
  );

  const impulse = useCallback((node: KnowledgeNode, amp: number, damp: number): void => {
    const a = getAnimNode(node);
    const dir = Math.random() * Math.PI * 2;
    a.svx = Math.cos(dir) * (amp - 1) * 3;
    a.svy = Math.sin(dir) * (amp - 1) * 2 - (amp - 1) * 2;
    a.sx = amp;
    a.sy = 1 / amp;
    void damp;
  }, [getAnimNode]);

  const ripple = useCallback((node: KnowledgeNode): void => {
    ripplesRef.current.push({
      x: node.x,
      y: node.y,
      r: 8,
      a: 0.6,
      speed: 120,
      color: node.color,
    });
  }, []);

  const spawnSignals = useCallback((node: KnowledgeNode): void => {
    const currentEdges = edgesRef.current;
    const nodeMap = new Map<string, KnowledgeNode>();
    layoutNodesRef.current.forEach((n: KnowledgeNode): void => {
      nodeMap.set(n.id, n);
    });
    const related: KnowledgeNode[] = [];
    currentEdges.forEach((e: KnowledgeEdge): void => {
      if (e.fromNode === node.id) {
        const t = nodeMap.get(e.toNode);
        if (t) related.push(t);
      } else if (e.toNode === node.id) {
        const t = nodeMap.get(e.fromNode);
        if (t) related.push(t);
      }
    });
    related.forEach((target: KnowledgeNode, i: number): void => {
      setTimeout((): void => {
        signalsRef.current.push({
          fromX: node.x,
          fromY: node.y,
          toX: target.x,
          toY: target.y,
          t: 0,
          speed: 0.55 + Math.random() * 0.3,
          color: node.color,
          size: 5 + Math.random() * 2,
        });
      }, i * 70);
    });
  }, []);

  const draw = useCallback(
    (time: number): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dt = Math.min(48, time - lastTimeRef.current);
      lastTimeRef.current = time;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      const t = transformRef.current;
      const currentNodes = layoutNodesRef.current;
      const currentEdges = edgesRef.current;
      const nodeMap = new Map<string, KnowledgeNode>();
      currentNodes.forEach((node: KnowledgeNode): void => {
        nodeMap.set(node.id, node);
      });

      const isDark = themeRef.current === 'dark';
      const labelBg = isDark ? 'rgba(30, 30, 50, .92)' : 'rgba(255,253,250,.92)';
      const labelStroke = isDark ? 'rgba(255, 255, 255, .08)' : 'rgba(255,255,255,.95)';
      const labelText = isDark ? '#E8E2F0' : '#6B4A54';
      const edgeBase = isDark ? 'rgba(138, 120, 181, 0.62)' : 'rgba(214, 180, 200, 0.62)';
      const edgeHl = isDark ? 'rgba(181, 156, 230, 0.82)' : 'rgba(255, 157, 187, 0.85)';
      const edgeHi = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.6)';
      const shadowColor = isDark ? 'rgba(0, 0, 0, .35)' : 'rgba(186, 140, 162, .20)';
      const descBg = isDark ? 'rgba(232, 226, 240, .92)' : 'rgba(107,74,84,.92)';
      const descText = isDark ? '#1A1A2E' : '#FFF6EC';
      const jellyRim = isDark ? 'rgba(255, 255, 255, .25)' : 'rgba(255,255,255,.75)';
      const jellyHiSoft = isDark ? 'rgba(255, 255, 255, .12)' : 'rgba(255,255,255,.18)';
      const jellyHiBright = isDark ? 'rgba(255, 255, 255, .65)' : 'rgba(255,255,255,.82)';
      const jellyHiTop = isDark ? 'rgba(255, 255, 255, .95)' : '#ffffff';
      const iconShadow = isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(107, 74, 84, 0.15)';

      currentNodes.forEach((n: KnowledgeNode): void => {
        const a = getAnimNode(n);
        const damping = 0.72;
        const stiffness = 0.18;
        const dx = 1 - a.sx;
        const dy = 1 - a.sy;
        a.svx += dx * stiffness * 2;
        a.svy += dy * stiffness * 2;
        a.svx *= damping;
        a.svy *= damping;
        a.sx += a.svx;
        a.sy += a.svy;
        if (Math.abs(a.svx) < 0.002 && Math.abs(a.svy) < 0.002) {
          a.sx = 1;
          a.sy = 1;
          a.svx = 0;
          a.svy = 0;
        }
        const targetHov = hoverNodeRef.current === n.id ? 1 : 0;
        a.hov += (targetHov - a.hov) * 0.18;
        const targetSel = selectedRef.current === n.id ? 1 : 0;
        a.sel += (targetSel - a.sel) * 0.16;
      });

      const signals = signalsRef.current;
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.t += s.speed * (dt / 1000);
        if (s.t >= 1) {
          const target = nodeMap.get(
            s.toX === s.fromX && s.toY === s.fromY
              ? currentNodes[0]?.id || ''
              : currentNodes.find(
                  (n: KnowledgeNode): boolean => n.x === s.toX && n.y === s.toY,
                )?.id || '',
          );
          ripplesRef.current.push({
            x: s.toX,
            y: s.toY,
            r: 6,
            a: 0.55,
            speed: 110,
            color: s.color,
          });
          if (target) void target;
          signals.splice(i, 1);
        }
      }

      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += r.speed * (dt / 1000);
        r.a -= 0.022 * (dt / 16);
        if (r.a <= 0) {
          ripples.splice(i, 1);
        }
      }

      ctx.save();
      ctx.translate(t.offsetX, t.offsetY);
      ctx.scale(t.scale, t.scale);

      currentEdges.forEach((edge: KnowledgeEdge): void => {
        const fromNode = nodeMap.get(edge.fromNode);
        const toNode = nodeMap.get(edge.toNode);
        if (!fromNode || !toNode) return;

        const fromA = getAnimNode(fromNode);
        const toA = getAnimNode(toNode);
        const a = Math.max(fromA.hov, toA.hov, fromA.sel * 0.6, toA.sel * 0.6);

        const fromR = getNodeRadius(fromNode);
        const toR = getNodeRadius(toNode);
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const startX = fromNode.x + (dx / dist) * fromR;
        const startY = fromNode.y + (dy / dist) * fromR;
        const endX = toNode.x - (dx / dist) * toR;
        const endY = toNode.y - (dy / dist) * toR;
        const mx = (startX + endX) / 2;
        const my = (startY + endY) / 2 - dist * 0.08;

        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(mx, my, endX, endY);
        ctx.strokeStyle = a > 0.1 ? edgeHl : edgeBase;
        ctx.lineWidth = 2.2 + a * 2;
        ctx.globalAlpha = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(startX, startY + 1);
        ctx.quadraticCurveTo(mx, my + 1, endX, endY + 1);
        ctx.strokeStyle = edgeHi;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.a;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * 0.75, 0, Math.PI * 2);
        ctx.globalAlpha = r.a * 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const s of signals) {
        const x = s.fromX + (s.toX - s.fromX) * s.t;
        const y = s.fromY + (s.toY - s.fromY) * s.t;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, s.size * 2.4);
        gr.addColorStop(0, s.color);
        gr.addColorStop(1, s.color + '00');
        ctx.beginPath();
        ctx.arc(x, y, s.size * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, s.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      currentNodes.forEach((node: KnowledgeNode): void => {
        const r = getNodeRadius(node);
        const a = getAnimNode(node);
        const cy = node.y;
        const nColor = mapNodeColor(node.color, themeRef.current);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(node.x, cy + r * 0.95 + 5, r * 0.82, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = shadowColor;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(node.x, cy);
        ctx.scale(a.sx, a.sy);

        if (a.sel > 0.02) {
          ctx.beginPath();
          ctx.arc(0, 0, r + 14 * a.sel, 0, Math.PI * 2);
          ctx.fillStyle = nColor + '2E';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, r + 24 * a.sel, 0, Math.PI * 2);
          ctx.fillStyle = nColor + '14';
          ctx.fill();
        }

        const bodyG = ctx.createRadialGradient(-r * 0.34, -r * 0.4, r * 0.08, 0, 0, r * 1.08);
        bodyG.addColorStop(0, jellyHiTop);
        bodyG.addColorStop(0.28, nColor);
        bodyG.addColorStop(1, shade(nColor, -28));
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyG;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, r * 0.28, r * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = jellyHiSoft;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(-r * 0.34, -r * 0.42, r * 0.27, r * 0.16, -0.55, 0, Math.PI * 2);
        ctx.fillStyle = jellyHiBright;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = jellyRim;
        ctx.lineWidth = 2;
        ctx.stroke();

        const iconSize = r * 0.7;
        ctx.save();
        ctx.font = `${iconSize}px/${iconSize}px ${getIconFont()}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = iconShadow;
        ctx.shadowBlur = 2;
        ctx.fillText(node.icon || '●', 0, 0);
        ctx.restore();

        ctx.restore();

        ctx.font = `${node.isCenter ? 700 : 600} 13px/${13 + 4}px ${UI_FONT}`;
        const tw = ctx.measureText(node.name).width;
        const padX = 12;
        const ly = cy + r + 8;
        const bh = 26;
        const br = 13;
        const bx = node.x - tw / 2 - padX;
        const bw = tw + padX * 2;

        ctx.beginPath();
        roundRect(ctx, bx, ly, bw, bh, br);
        ctx.fillStyle = labelBg;
        ctx.fill();
        ctx.strokeStyle = labelStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (a.sel > 0.3) {
          ctx.beginPath();
          roundRect(ctx, bx, ly, bw, bh, br);
          ctx.strokeStyle = nColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = a.sel;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = labelText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name, node.x, ly + bh / 2);

        if ((a.hov > 0.25 || a.sel > 0.3) && node.description) {
          const d = node.description.length > 18
            ? node.description.slice(0, 18) + '…'
            : node.description;
          ctx.font = `12px ${UI_FONT}`;
          const dw = ctx.measureText(d).width;
          const descAlpha = Math.max(a.hov, a.sel);
          ctx.globalAlpha = Math.min(1, descAlpha * 1.4);
          ctx.beginPath();
          roundRect(ctx, node.x - dw / 2 - 12, ly + bh + 4, dw + 24, 26, 13);
          ctx.fillStyle = descBg;
          ctx.fill();
          ctx.fillStyle = descText;
          ctx.fillText(d, node.x, ly + bh + 17);
          ctx.globalAlpha = 1;
        }
      });

      ctx.restore();
    },
    [getNodeRadius, getAnimNode],
  );

  const hoverNodeRef = useRef<string | null>(null);

  const animate = useCallback((): void => {
    const now = performance.now();
    if (!lastTimeRef.current) lastTimeRef.current = now;
    if (visibleRef.current) {
      draw(now);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return (): void => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (rect.width > 0 && rect.height > 0) {
        canvasSizedRef.current = true;
        if (nodesRef.current.length > 0) {
          const wasFitted = fittedRef.current;
          layoutNodesRef.current = buildLayout(
            nodesRef.current,
            rect.width < 768,
          );
          fitView();
          if (!wasFitted) {
            fittedRef.current = true;
            const currentNodes = layoutNodesRef.current;
            for (let i = 0; i < currentNodes.length; i++) {
              const nd = currentNodes[i];
              setTimeout((): void => {
                impulse(nd, 1.28, 0.7);
                ripple(nd);
              }, i * 70);
            }
            if (currentNodes[0]) {
              setTimeout((): void => spawnSignals(currentNodes[0]), 220);
            }
          }
        }
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return (): void => ro.disconnect();
  }, []);

  const fitView = useCallback((): void => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const isPortrait = rect.width < 768;
    layoutNodesRef.current = buildLayout(nodesRef.current, isPortrait);
    const currentNodes = layoutNodesRef.current;
    if (currentNodes.length === 0) return;

    const labelExtra = 40;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    currentNodes.forEach((node: KnowledgeNode): void => {
      const r = getNodeRadius(node);
      minX = Math.min(minX, node.x - r);
      minY = Math.min(minY, node.y - r);
      maxX = Math.max(maxX, node.x + r);
      maxY = Math.max(maxY, node.y + r + labelExtra);
    });
    const padX = isPortrait ? 24 : 120;
    const padY = isPortrait ? 24 : 120;
    const graphW = maxX - minX + padX * 2;
    const graphH = maxY - minY + padY * 2;
    const scale = Math.min(rect.width / graphW, rect.height / graphH);
    const minScale = isPortrait ? 0.4 : MIN_SCALE;
    const clampedScale = Math.min(1, Math.max(minScale, scale));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    transformRef.current = {
      scale: clampedScale,
      offsetX: rect.width / 2 - centerX * clampedScale,
      offsetY: rect.height / 2 - centerY * clampedScale,
    };
    setDisplayScale(clampedScale);
  }, [getNodeRadius]);

  useEffect(() => {
    if (nodes.length > 0 && canvasSizedRef.current && !fittedRef.current) {
      fittedRef.current = true;
      fitView();
      const currentNodes = layoutNodesRef.current;
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        setTimeout((): void => {
          impulse(node, 1.28, 0.7);
          ripple(node);
        }, i * 70);
      }
      if (currentNodes[0]) {
        setTimeout((): void => spawnSignals(currentNodes[0]), 220);
      }
    }
  }, [nodes.length, fitView, impulse, ripple, spawnSignals]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const hitNode = hitTestNode(sx, sy);
      if (hitNode) {
        dragRef.current = {
          isDragging: true,
          isNodeDrag: true,
          draggedNodeId: hitNode.id,
          startX: sx,
          startY: sy,
          nodeStartX: hitNode.x,
          nodeStartY: hitNode.y,
          offsetStartX: 0,
          offsetStartY: 0,
          moved: false,
        };
        impulse(hitNode, 1.28, 0.72);
        ripple(hitNode);
      } else {
        dragRef.current = {
          isDragging: true,
          isNodeDrag: false,
          draggedNodeId: null,
          startX: sx,
          startY: sy,
          nodeStartX: 0,
          nodeStartY: 0,
          offsetStartX: transformRef.current.offsetX,
          offsetStartY: transformRef.current.offsetY,
          moved: false,
        };
      }
    },
    [hitTestNode, impulse, ripple],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (drag.isDragging) {
        const dx = sx - drag.startX;
        const dy = sy - drag.startY;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) {
          drag.moved = true;
        }
        if (drag.isNodeDrag && drag.draggedNodeId) {
          const scale = transformRef.current.scale;
          const newX = drag.nodeStartX + dx / scale;
          const newY = drag.nodeStartY + dy / scale;
          const node = nodesRef.current.find(
            (n: KnowledgeNode): boolean => n.id === drag.draggedNodeId,
          );
          if (node) {
            node.x = newX;
            node.y = newY;
          }
        } else {
          transformRef.current.offsetX = drag.offsetStartX + dx;
          transformRef.current.offsetY = drag.offsetStartY + dy;
        }
      } else {
        const h = hitTestNode(sx, sy);
        const newId = h ? h.id : null;
        if (newId !== hoverNodeRef.current) {
          hoverNodeRef.current = newId;
          if (h) impulse(h, 1.1, 0.92);
        }
      }
    },
    [hitTestNode, impulse],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (drag.isNodeDrag && drag.draggedNodeId && drag.moved) {
        const node = nodesRef.current.find(
          (n: KnowledgeNode): boolean => n.id === drag.draggedNodeId,
        );
        if (node) {
          onNodePositionChange(drag.draggedNodeId, node.x, node.y);
          impulse(node, 1.2, 0.72);
          ripple(node);
        }
      } else if (!drag.moved) {
        const hitNode = hitTestNode(sx, sy);
        const now = Date.now();
        if (hitNode) {
          if (
            now - lastClickTimeRef.current < 350 &&
            lastClickNodeRef.current === hitNode.id
          ) {
            onEditNode(hitNode.id);
            lastClickTimeRef.current = 0;
            lastClickNodeRef.current = null;
          } else {
            onSelectNode(hitNode.id);
            lastClickTimeRef.current = now;
            lastClickNodeRef.current = hitNode.id;
            spawnSignals(hitNode);
          }
        } else {
          onSelectNode(null);
          lastClickTimeRef.current = 0;
          lastClickNodeRef.current = null;
        }
      }

      dragRef.current.isDragging = false;
      dragRef.current.isNodeDrag = false;
      dragRef.current.draggedNodeId = null;
    },
    [hitTestNode, onNodePositionChange, onEditNode, onSelectNode, impulse, ripple, spawnSignals],
  );

  const zoomAt = useCallback((sx: number, sy: number, deltaFactor: number): void => {
    const t = transformRef.current;
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, t.scale * (1 + deltaFactor)),
    );
    if (newScale === t.scale) return;
    const ratio = newScale / t.scale;
    transformRef.current = {
      scale: newScale,
      offsetX: sx - (sx - t.offsetX) * ratio,
      offsetY: sy - (sy - t.offsetY) * ratio,
    };
    setDisplayScale(newScale);
  }, []);

  const handleWheelNative = useCallback(
    (e: WheelEvent): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (!hitTestGraph(sx, sy)) return;
      e.preventDefault();
      const delta = -e.deltaY * WHEEL_ZOOM_FACTOR;
      zoomAt(sx, sy, delta);
    },
    [hitTestGraph, zoomAt],
  );

  const handleWheel = useCallback(
    (_e: React.WheelEvent<HTMLCanvasElement>): void => {},
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onEnter = (): void => {
      canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    };
    const onLeave = (): void => {
      canvas.removeEventListener('wheel', handleWheelNative);
    };
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('mouseleave', onLeave);
    return (): void => {
      canvas.removeEventListener('mouseenter', onEnter);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('wheel', handleWheelNative);
    };
  }, [handleWheelNative]);

  const handleTouchStart = useCallback(
    (e: TouchEvent): void => {
      if (e.touches.length === 1) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;

        const hitNode = hitTestNode(sx, sy);
        if (hitNode) {
          dragRef.current = {
            isDragging: true,
            isNodeDrag: true,
            draggedNodeId: hitNode.id,
            startX: sx,
            startY: sy,
            nodeStartX: hitNode.x,
            nodeStartY: hitNode.y,
            offsetStartX: 0,
            offsetStartY: 0,
            moved: false,
          };
          impulse(hitNode, 1.28, 0.7);
          ripple(hitNode);
        } else {
          dragRef.current = {
            isDragging: true,
            isNodeDrag: false,
            draggedNodeId: null,
            startX: sx,
            startY: sy,
            nodeStartX: 0,
            nodeStartY: 0,
            offsetStartX: transformRef.current.offsetX,
            offsetStartY: transformRef.current.offsetY,
            moved: false,
          };
        }
      } else if (e.touches.length === 2) {
        dragRef.current.isDragging = false;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pinchRef.current = {
          active: true,
          lastDist: dist,
          lastMidX: ((t1.clientX + t2.clientX) / 2) - rect.left,
          lastMidY: ((t1.clientY + t2.clientY) / 2) - rect.top,
        };
      }
    },
    [hitTestNode, impulse, ripple],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent): void => {
      if (pinchRef.current.active && e.touches.length === 2) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pinch = pinchRef.current;
        const midX = ((t1.clientX + t2.clientX) / 2) - rect.left;
        const midY = ((t1.clientY + t2.clientY) / 2) - rect.top;

        if (pinch.lastDist > 0 && dist > 0) {
          const ratio = dist / pinch.lastDist;
          const t = transformRef.current;
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * ratio));
          const actualRatio = newScale / t.scale;
          transformRef.current = {
            scale: newScale,
            offsetX: midX - (midX - t.offsetX) * actualRatio + (midX - pinch.lastMidX),
            offsetY: midY - (midY - t.offsetY) * actualRatio + (midY - pinch.lastMidY),
          };
          setDisplayScale(newScale);
        }

        pinch.lastDist = dist;
        pinch.lastMidX = midX;
        pinch.lastMidY = midY;
        return;
      }

      const drag = dragRef.current;
      if (!drag.isDragging || e.touches.length !== 1) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.touches[0].clientX - rect.left;
      const sy = e.touches[0].clientY - rect.top;

      const dx = sx - drag.startX;
      const dy = sy - drag.startY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) {
        drag.moved = true;
      }

      if (drag.isNodeDrag && drag.draggedNodeId) {
        const scale = transformRef.current.scale;
        const newX = drag.nodeStartX + dx / scale;
        const newY = drag.nodeStartY + dy / scale;
        const node = nodesRef.current.find(
          (n: KnowledgeNode): boolean => n.id === drag.draggedNodeId,
        );
        if (node) {
          node.x = newX;
          node.y = newY;
        }
      } else {
        transformRef.current.offsetX = drag.offsetStartX + dx;
        transformRef.current.offsetY = drag.offsetStartY + dy;
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent): void => {
      if (pinchRef.current.active && e.touches.length < 2) {
        pinchRef.current.active = false;
        return;
      }

      const drag = dragRef.current;
      if (!drag.isDragging) return;

      if (drag.isNodeDrag && drag.draggedNodeId && drag.moved) {
        const node = nodesRef.current.find(
          (n: KnowledgeNode): boolean => n.id === drag.draggedNodeId,
        );
        if (node) {
          onNodePositionChange(drag.draggedNodeId, node.x, node.y);
          impulse(node, 1.22, 0.72);
          ripple(node);
        }
      } else if (!drag.moved && e.changedTouches.length === 1) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const hitNode = hitTestNode(sx, sy);
        if (hitNode) {
          onSelectNode(hitNode.id);
          impulse(hitNode, 1.18, 0.8);
          ripple(hitNode);
          spawnSignals(hitNode);
        } else {
          onSelectNode(null);
        }
      }

      dragRef.current.isDragging = false;
      dragRef.current.isNodeDrag = false;
      dragRef.current.draggedNodeId = null;
    },
    [hitTestNode, onNodePositionChange, onSelectNode, impulse, ripple, spawnSignals],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
    return (): void => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleTouchStartNoop = useCallback(
    (_e: React.TouchEvent<HTMLCanvasElement>): void => {},
    [],
  );

  const handleAddClick = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerScreen = {
      x: rect.width / 2,
      y: rect.height / 2,
    };
    const world = screenToWorld(centerScreen.x, centerScreen.y);
    onAddNode(world.x, world.y);
  }, [screenToWorld, onAddNode]);

  const handleZoomIn = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, 0.2);
  }, [zoomAt]);

  const handleZoomOut = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, -0.2);
  }, [zoomAt]);

  const handleFitView = useCallback((): void => {
    fitView();
    const currentNodes = nodesRef.current;
    currentNodes.forEach((n: KnowledgeNode, i: number): void => {
      setTimeout((): void => {
        impulse(n, 1.3, 0.7);
        ripple(n);
      }, i * 50);
    });
    if (currentNodes[0]) setTimeout((): void => spawnSignals(currentNodes[0]), 200);
  }, [fitView, impulse, ripple, spawnSignals]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStartNoop}
        onTouchMove={handleTouchStartNoop}
        onTouchEnd={handleTouchStartNoop}
      />
      <div className="kb-zoom-ctrl">
        <button
          type="button"
          onClick={handleZoomIn}
          className="kb-jelly"
          aria-label="放大"
        >
          <ZoomIn size={19} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="kb-jelly"
          aria-label="缩小"
        >
          <ZoomOut size={19} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={handleFitView}
          className="kb-jelly"
          aria-label="适应视图"
        >
          <Maximize2 size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onScrollDown}
          className="kb-jelly"
          aria-label="向下滚动"
          title="向下浏览"
        >
          <Shuffle size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={handleAddClick}
          className="kb-jelly kb-acc"
          aria-label="新增节点"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
      <div className="absolute left-5 top-24 z-20 px-3 py-1.5 rounded-full text-xs font-bold pointer-events-none"
        style={{
          background: 'rgba(255,253,250,.78)',
          backdropFilter: 'blur(10px)',
          color: '#85656D',
          boxShadow: 'var(--sh-1)',
          border: '1.5px solid rgba(255,255,255,.9)',
        }}
      >
        {Math.round(displayScale * 100)}%
      </div>
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default KnowledgeCanvas;

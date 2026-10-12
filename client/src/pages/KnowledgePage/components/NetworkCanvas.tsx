import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { KnowledgeNode, KnowledgeEdge } from '@shared/api.interface';
import {
  useGraphQuery,
  useUpdateNodeMutation,
  useCreateNodeMutation,
  useDeleteNodeMutation,
  useCreateEdgeMutation,
} from '../useKnowledgeData';
import KnowledgeCanvas from '../KnowledgeCanvas';
import NodeEditDialog from '../NodeEditDialog';
import AddNodeDialog from '../AddNodeDialog';

const DECORATIONS = [
  { type: 'spark', left: '6%', top: '22%', size: 28, delay: 0, color: 'var(--butter-d)' },
  { type: 'heart', left: '10%', top: '40%', size: 22, delay: 1.2, color: 'var(--blush-d)' },
  { type: 'flower', right: '9%', top: '28%', size: 34, delay: 0.7, color: 'var(--lav)' },
  { type: 'spark', right: '14%', top: '44%', size: 20, delay: 2, color: 'var(--powder-d)' },
  { type: 'cherry', left: '20%', top: '70%', size: 28, delay: 1.5, color: '' },
  { type: 'heart', right: '22%', top: '65%', size: 18, delay: 0.5, color: 'var(--peach-d)' },
  { type: 'flower', left: '30%', top: '15%', size: 22, delay: 2.5, color: 'var(--mint-d)' },
];

interface DecoItem {
  type: string;
  left?: string;
  right?: string;
  top: string;
  size: number;
  delay: number;
  color: string;
}

interface NetworkCanvasProps {
  onScrollDown: () => void;
}

const renderDeco = (
  type: string,
  style: React.CSSProperties,
  className: string = '',
): React.ReactNode => {
  const cls = `kb-deco kb-tw ${className}`;
  const renderSvg = (id: string): React.ReactNode => (
    <svg
      className={cls}
      style={style}
      viewBox={
        id === 'i-cat'
          ? '0 0 140 124'
          : id === 'i-cake'
            ? '0 0 120 134'
            : id === 'i-spark'
              ? '0 0 24 24'
              : id === 'i-heart'
                ? '0 0 24 24'
                : id === 'i-flower'
                  ? '0 0 40 40'
                  : id === 'i-cherry'
                    ? '0 0 40 40'
                    : '0 0 24 24'
      }
      aria-hidden="true"
    >
      <use href={`#${id}`} />
    </svg>
  );

  switch (type) {
    case 'spark':
      return renderSvg('i-spark');
    case 'heart':
      return renderSvg('i-heart');
    case 'flower':
      return renderSvg('i-flower');
    case 'cherry':
      return renderSvg('i-cherry');
    case 'cat':
      return (
        <svg
          className={`kb-deco kb-cat ${className}`}
          style={style}
          viewBox="0 0 140 124"
          aria-hidden="true"
        >
          <use href="#i-cat" />
        </svg>
      );
    case 'cake':
      return (
        <svg
          className={`kb-deco kb-cake ${className}`}
          style={style}
          viewBox="0 0 120 134"
          aria-hidden="true"
        >
          <use href="#i-cake" />
        </svg>
      );
    default:
      return null;
  }
};

const NetworkCanvas: React.FC<NetworkCanvasProps> = ({ onScrollDown }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<KnowledgeNode | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addPosition, setAddPosition] = useState<{ x: number; y: number } | null>(null);
  const [canvasVisible, setCanvasVisible] = useState(true);
  const posTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const graphQuery = useGraphQuery();
  const nodes: KnowledgeNode[] = graphQuery.data?.nodes ?? [];
  const edges: KnowledgeEdge[] = graphQuery.data?.edges ?? [];

  const updateNodeMutation = useUpdateNodeMutation();
  const createNodeMutation = useCreateNodeMutation();
  const deleteNodeMutation = useDeleteNodeMutation();
  const createEdgeMutation = useCreateEdgeMutation();

  const handleSelectNode = useCallback((id: string | null): void => {
    setSelectedNodeId(id);
  }, []);

  const handleEditNode = useCallback((id: string): void => {
    const node = nodes.find((n: KnowledgeNode): boolean => n.id === id);
    if (node) {
      setEditingNode(node);
      setEditDialogOpen(true);
    }
  }, [nodes]);

  const handleSaveNode = useCallback(
    (data: {
      name: string;
      description: string;
      icon: string;
      color: string;
    }): void => {
      if (!editingNode) return;
      updateNodeMutation.mutate(
        { id: editingNode.id, data },
        {
          onSuccess: (): void => {
            setEditDialogOpen(false);
            setEditingNode(null);
          },
        },
      );
    },
    [editingNode, updateNodeMutation],
  );

  const handleDeleteNode = useCallback((): void => {
    if (!editingNode) return;
    deleteNodeMutation.mutate(editingNode.id, {
      onSuccess: (): void => {
        setSelectedNodeId(null);
        setEditDialogOpen(false);
        setEditingNode(null);
      },
    });
  }, [editingNode, deleteNodeMutation]);

  const handleAddNode = useCallback(
    (x: number, y: number): void => {
      setAddPosition({ x, y });
      setAddDialogOpen(true);
    },
    [],
  );

  const handleAddConfirm = useCallback(
    (data: { name: string; icon: string; color: string; parentId: string }): void => {
      if (!addPosition) return;
      const parent = nodes.find((n: KnowledgeNode): boolean => n.id === data.parentId);
      const angle = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * 60;
      const nx = parent ? parent.x + Math.cos(angle) * dist : addPosition.x;
      const ny = parent ? parent.y + Math.sin(angle) * dist : addPosition.y;

      createNodeMutation.mutate(
        {
          name: data.name,
          description: '',
          icon: data.icon,
          color: data.color,
          x: nx,
          y: ny,
        },
        {
          onSuccess: (newNode): void => {
            createEdgeMutation.mutate(
              {
                fromNode: data.parentId,
                toNode: newNode.id,
              },
              {
                onSuccess: (): void => {
                  setSelectedNodeId(newNode.id);
                  setAddDialogOpen(false);
                  setAddPosition(null);
                },
              },
            );
          },
        },
      );
    },
    [addPosition, nodes, createNodeMutation, createEdgeMutation],
  );

  const handleNodePositionChange = useCallback(
    (id: string, x: number, y: number): void => {
      const timers = posTimersRef.current;
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);

      const timer = setTimeout((): void => {
        updateNodeMutation.mutate({ id, data: { x, y } });
        timers.delete(id);
      }, 500);
      timers.set(id, timer);
    },
    [updateNodeMutation],
  );

  const handleCloseDialog = useCallback((): void => {
    setEditDialogOpen(false);
    setEditingNode(null);
  }, []);

  useEffect(() => {
    if (!canvasWrapRef.current) return;
    const io = new IntersectionObserver(
      (es): void => {
        setCanvasVisible(es[0]?.isIntersecting ?? true);
      },
      { threshold: 0 },
    );
    io.observe(canvasWrapRef.current);
    return (): void => io.disconnect();
  }, []);

  return (
    <div className="kb-dashboard-section" id="canvas">
      <div className="kb-canvas-card" ref={canvasWrapRef}>
        {DECORATIONS.map(
          (d: DecoItem, i: number): React.ReactNode => (
            <React.Fragment key={`d-${i}`}>
              {renderDeco(d.type, {
                left: d.left,
                right: d.right,
                top: d.top,
                width: d.size,
                color: d.color || undefined,
                animationDelay: `${d.delay}s`,
                ['--rot' as never]: `${(i % 2 === 0 ? 1 : -1) * (8 + i * 3)}deg`,
                position: 'absolute',
                zIndex: 1,
                pointerEvents: 'none',
              })}
            </React.Fragment>
          ),
        )}
        <div className="kb-canvas-card-header">
          <div className="kb-icon">
            <span>✨</span>
          </div>
          <div>
            <div className="kb-canvas-card-title">知识网络</div>
            <div className="kb-canvas-card-desc">拖动节点，编织你的知识星空</div>
          </div>
        </div>
        <div className="kb-canvas-card-body">
          <KnowledgeCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onEditNode={handleEditNode}
            onAddNode={handleAddNode}
            onNodePositionChange={handleNodePositionChange}
            onScrollDown={onScrollDown}
            visible={canvasVisible}
          />
        </div>
      </div>

      <NodeEditDialog
        node={editingNode}
        open={editDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
      />

      <AddNodeDialog
        open={addDialogOpen}
        nodes={nodes}
        onClose={(): void => {
          setAddDialogOpen(false);
          setAddPosition(null);
        }}
        onConfirm={handleAddConfirm}
      />
    </div>
  );
};

export default NetworkCanvas;

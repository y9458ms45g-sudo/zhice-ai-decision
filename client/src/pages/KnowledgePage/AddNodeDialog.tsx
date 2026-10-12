import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { KnowledgeNode } from '@shared/api.interface';

interface AddNodeDialogProps {
  open: boolean;
  nodes: KnowledgeNode[];
  onClose: () => void;
  onConfirm: (data: {
    name: string;
    icon: string;
    color: string;
    parentId: string;
  }) => void;
}

const COLOR_OPTIONS = [
  '#FFC9DE',
  '#C7DEFA',
  '#B9E7D4',
  '#DCC9F7',
  '#FFE7A8',
  '#FFD4B8',
  '#B8E8E0',
  '#FFB8C9',
];

const EMOJI_OPTIONS = [
  '📚', '💡', '🎯', '⭐', '🚀', '🌟', '🎨', '🔮',
  '💎', '🌸', '🍀', '🦋', '🌈', '🎪', '🧸', '🎀',
  '🍓', '🧁', '🍬', '🍭', '🎂', '🍰', '🍩', '🍪',
  '📝', '📖', '🎓', '💻', '🎵', '🎮', '🌙', '☀️',
];

const AddNodeDialog: React.FC<AddNodeDialogProps> = ({
  open,
  nodes,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💡');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setIcon('💡');
      setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
      if (nodes.length > 0) {
        const center = nodes.find((n: KnowledgeNode): boolean => n.isCenter);
        setParentId(center ? center.id : nodes[0].id);
      } else {
        setParentId('');
      }
    }
  }, [open, nodes]);

  const handleConfirm = (): void => {
    if (!name.trim()) return;
    if (!parentId) return;
    onConfirm({ name: name.trim(), icon, color, parentId });
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleConfirm();
    }
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
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          onClick={onClose}
          className="kb-jelly"
          aria-label="关闭"
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
            padding: 0,
            zIndex: 2,
          }}
        >
          <X size={17} />
        </button>

        <h3>
          <Sparkles size={18} style={{ color: 'var(--blush-d)' }} />
          添加新节点
        </h3>

        <label>节点名称</label>
        <input
          type="text"
          value={name}
          onChange={(e): void => setName(e.target.value)}
          placeholder="给节点起个名字～"
          autoFocus
        />

        <label>图标 Icon</label>
        <div className="kb-pick">
          {EMOJI_OPTIONS.map((emoji: string): React.ReactNode => (
            <button
              key={emoji}
              type="button"
              onClick={(): void => setIcon(emoji)}
              className={`kb-jelly ${icon === emoji ? 'kb-sel' : ''}`}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label>颜色 Color</label>
        <div className="kb-pick">
          {COLOR_OPTIONS.map((c: string): React.ReactNode => (
            <button
              key={c}
              type="button"
              onClick={(): void => setColor(c)}
              className={`kb-jelly kb-sw ${color === c ? 'kb-sel' : ''}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>

        <label>连接到</label>
        <select
          value={parentId}
          onChange={(e): void => setParentId(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--cream-0)',
            border: '2px solid var(--cream-3)',
            borderRadius: 'var(--r-sm)',
            color: 'var(--ink)',
            padding: '12px 16px',
            fontSize: 15,
            boxShadow: 'inset 0 2px 5px rgba(196, 146, 166, .1)',
            transition: 'all .28s var(--ease-soft)',
            cursor: 'pointer',
          }}
        >
          {nodes.map((n: KnowledgeNode): React.ReactNode => (
            <option key={n.id} value={n.id}>
              {n.icon} {n.name}
            </option>
          ))}
        </select>

        <div className="kb-modal-btns">
          <button
            type="button"
            className="kb-btn kb-ghost"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="kb-btn kb-primary"
            onClick={handleConfirm}
            disabled={!name.trim() || !parentId}
          >
            添加节点
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddNodeDialog;

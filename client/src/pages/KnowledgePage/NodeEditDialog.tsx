import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Sparkles } from 'lucide-react';
import type { KnowledgeNode } from '@shared/api.interface';

interface NodeEditDialogProps {
  node: KnowledgeNode | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    icon: string;
    color: string;
  }) => void;
  onDelete: () => void;
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

const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  node,
  open,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💡');
  const [color, setColor] = useState('#FFC9DE');

  useEffect(() => {
    if (open && node) {
      setName(node.name);
      setDescription(node.description);
      setIcon(node.icon);
      setColor(node.color);
    }
  }, [open, node]);

  const handleSave = (): void => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description, icon, color });
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSave();
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
          {node?.isCenter ? '中心节点' : '编辑节点'}
        </h3>

        <label>图标 Icon</label>
        <div className="kb-pick">
          {EMOJI_OPTIONS.map((emoji: string): React.ReactNode => (
            <button
              key={emoji}
              type="button"
              onClick={(): void => setIcon(emoji)}
              className={`kb-jelly ${icon === emoji ? 'kb-sel' : ''}`}
              style={{ fontSize: 18 }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label>颜色 Color</label>
        <div className="kb-pick" style={{ gap: 10 }}>
          {COLOR_OPTIONS.map((c: string): React.ReactNode => (
            <button
              key={c}
              type="button"
              onClick={(): void => setColor(c)}
              className={`kb-jelly kb-sw ${color === c ? 'kb-sel' : ''}`}
              style={{ background: c }}
              aria-label={`颜色 ${c}`}
            />
          ))}
        </div>

        <label>名称 Name</label>
        <input
          type="text"
          value={name}
          onChange={(e): void => setName(e.target.value)}
          placeholder="输入节点的名字呀～"
        />

        <label>描述 Description</label>
        <textarea
          value={description}
          onChange={(e): void => setDescription(e.target.value)}
          rows={4}
          placeholder="简单介绍一下这个节点吧…"
        />

        <div className="kb-modal-btns">
          {node && !node.isCenter && (
            <button
              type="button"
              onClick={onDelete}
              className="kb-btn kb-danger kb-jelly"
            >
              <Trash2 size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              删除节点
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="kb-btn kb-ghost kb-jelly"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="kb-btn kb-primary kb-jelly"
            style={!name.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <Save size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeEditDialog;

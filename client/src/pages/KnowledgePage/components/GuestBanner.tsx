import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isGuestMode } from '@client/src/api/guest-mode';

const GuestBanner: React.FC = () => {
  const navigate = useNavigate();
  const isGuest = isGuestMode();

  if (!isGuest) return null;

  return (
    <div
      className="kb-guest-banner"
      style={{
        width: '100%',
        padding: '10px 16px',
        background: 'linear-gradient(90deg, #FFF1E0 0%, #FFE8D0 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: '#B8860B',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>👋</span>
        <span>你正在游客模式，数据仅保存在本地浏览器，注册登录后可同步到云端</span>
      </div>
      <button
        type="button"
        onClick={(): void => { navigate('/login'); }}
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: 500,
          color: '#E67E22',
          boxShadow: '0 2px 8px rgba(230, 126, 34, 0.15)',
        }}
        className="transition-all duration-200 active:scale-95 hover:opacity-90"
      >
        注册/登录
      </button>
    </div>
  );
};

export default GuestBanner;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { login, register, saveAuth } from '@client/src/api/auth';
import { enterGuestMode } from '@client/src/api/guest-mode';
import type { AuthUser } from '@shared/api.interface';

type TabType = 'login' | 'register';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      const data = tab === 'login'
        ? await login({ email, password })
        : await register({ email, password, nickname: nickname || undefined });

      await saveAuth(data.token, data.user as AuthUser);
      toast.success(tab === 'login' ? '登录成功' : '注册成功');
      navigate('/');
    } catch (err: unknown) {
      logger.error('认证失败', err);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message
        || (tab === 'login' ? '登录失败，请检查邮箱和密码' : '注册失败，请稍后重试');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #FFF6EC 0%, #FFF1F4 50%, #F5F1FF 100%)',
      }}
    >
      <div
        className="w-full max-w-md bg-white/70 backdrop-blur-md rounded-[32px] p-8 md:p-10"
        style={{
          boxShadow:
            'inset 0 2px 4px rgba(255,255,255,0.9), 0 12px 32px rgba(255, 180, 200, 0.3)',
        }}
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍮</div>
          <h1
            className="text-2xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"
            style={{ letterSpacing: '0.5px' }}
          >
            智策 · 个人AI决策助手
          </h1>
          <p className="text-sm text-gray-400 mt-2">你的专属人生战略顾问</p>
        </div>

        <div
          className="flex bg-pink-50/80 rounded-2xl p-1 mb-6"
          style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.2)' }}
        >
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === 'login'
                ? 'bg-white text-pink-500'
                : 'text-gray-400 hover:text-gray-500'
            }`}
            style={
              tab === 'login'
                ? { boxShadow: '0 4px 12px rgba(255, 180, 200, 0.4)' }
                : undefined
            }
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === 'register'
                ? 'bg-white text-purple-500'
                : 'text-gray-400 hover:text-gray-500'
            }`}
            style={
              tab === 'register'
                ? { boxShadow: '0 4px 12px rgba(200, 180, 255, 0.4)' }
                : undefined
            }
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-sm text-gray-500 mb-1.5 ml-1">昵称（选填）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己起个好听的名字"
                className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-100 text-gray-700 text-sm focus:outline-none focus:border-pink-300 transition-colors placeholder:text-gray-300"
                style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)' }}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-500 mb-1.5 ml-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-100 text-gray-700 text-sm focus:outline-none focus:border-pink-300 transition-colors placeholder:text-gray-300"
              style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)' }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1.5 ml-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-100 text-gray-700 text-sm focus:outline-none focus:border-pink-300 transition-colors placeholder:text-gray-300"
              style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)' }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm mt-2 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: tab === 'login'
                ? 'linear-gradient(135deg, #FFB8C9 0%, #FFC9DE 100%)'
                : 'linear-gradient(135deg, #DCC9F7 0%, #C7DEFA 100%)',
              boxShadow: tab === 'login'
                ? '0 6px 20px rgba(255, 180, 200, 0.5), inset 0 2px 4px rgba(255,255,255,0.6)'
                : '0 6px 20px rgba(200, 180, 255, 0.5), inset 0 2px 4px rgba(255,255,255,0.6)',
            }}
          >
            {loading
              ? '请稍候...'
              : tab === 'login' ? '登录' : '创建账号'
            }
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          {tab === 'login' ? (
            <>还没有账号？<button
              type="button"
              onClick={() => { setTab('register'); setError(''); }}
              className="text-pink-400 hover:text-pink-500 font-medium"
            >立即注册</button></>
          ) : (
            <>已有账号？<button
              type="button"
              onClick={() => { setTab('login'); setError(''); }}
              className="text-purple-400 hover:text-purple-500 font-medium"
            >去登录</button></>
          )}
        </p>

        <button
          type="button"
          onClick={() => {
            enterGuestMode();
            navigate('/');
          }}
          className="w-full py-3 mt-4 rounded-2xl font-medium text-sm transition-all duration-200 active:scale-95"
          style={{
            background: '#F0F0F0',
            color: '#888',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 4px 12px rgba(0, 0, 0, 0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E8E8E8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F0F0F0';
          }}
        >
          先逛逛，游客体验 →
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

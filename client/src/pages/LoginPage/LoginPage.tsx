import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { login, register, saveAuth } from '@client/src/api/auth';
import { enterGuestMode } from '@client/src/api/guest-mode';
import type { AuthUser } from '@shared/api.interface';

type TabType = 'login' | 'register';

const LoginPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  const REMEMBER_EMAIL_KEY = 'remembered_email';
  const REMEMBER_PASSWORD_KEY = 'remembered_password';
  const REMEMBER_ME_FLAG_KEY = 'remember_me';
  const LEGACY_EMAIL_KEY = 'zhice_remember_email';

  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY)
        ?? localStorage.getItem(LEGACY_EMAIL_KEY);
      const storedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY);
      const rememberFlag = localStorage.getItem(REMEMBER_ME_FLAG_KEY) === 'true';

      if (storedEmail) {
        setSavedEmail(storedEmail);
        setEmail(storedEmail);
        setRememberMe(true);
      }
      if (storedPassword && rememberFlag) {
        setPassword(storedPassword);
        setRememberPassword(true);
      }
    } catch {
      // 忽略 localStorage 读取失败
    }
  }, []);

  const clearSavedEmail = useCallback(() => {
    try {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.removeItem(REMEMBER_PASSWORD_KEY);
      localStorage.removeItem(REMEMBER_ME_FLAG_KEY);
      localStorage.removeItem(LEGACY_EMAIL_KEY);
    } catch {
      // 忽略
    }
    setSavedEmail('');
    setRememberMe(false);
    setRememberPassword(false);
    setEmail('');
    setPassword('');
    toast.success('已清除记住的账号');
  }, []);

  const handleQuickLogin = useCallback(() => {
    if (!savedEmail) return;
    setEmail(savedEmail);
    setRememberMe(true);
    setPassword('');
    setTab('login');
    setError('');
  }, [savedEmail]);

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

      if (rememberMe && tab === 'login') {
        try {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email);
          localStorage.removeItem(LEGACY_EMAIL_KEY);
          setSavedEmail(email);
          if (rememberPassword) {
            localStorage.setItem(REMEMBER_PASSWORD_KEY, password);
            localStorage.setItem(REMEMBER_ME_FLAG_KEY, 'true');
          } else {
            localStorage.removeItem(REMEMBER_PASSWORD_KEY);
            localStorage.removeItem(REMEMBER_ME_FLAG_KEY);
          }
        } catch {
          // 忽略 localStorage 写入失败
        }
      } else if (!rememberMe && savedEmail && tab === 'login') {
        try {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
          localStorage.removeItem(REMEMBER_PASSWORD_KEY);
          localStorage.removeItem(REMEMBER_ME_FLAG_KEY);
          localStorage.removeItem(LEGACY_EMAIL_KEY);
        } catch {
          // 忽略
        }
        setSavedEmail('');
      }

      toast.success(tab === 'login' ? '登录成功' : '注册成功');
      window.location.replace('/');
    } catch (err: unknown) {
      logger.error('认证失败', err);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message
        || (tab === 'login' ? '邮箱或密码错误，请重试' : '注册失败，请稍后重试');
      setError(msg);
      toast.error(msg);
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-gray-500 ml-1">邮箱</label>
              {savedEmail && tab === 'login' && (
                <button
                  type="button"
                  onClick={clearSavedEmail}
                  className="text-xs text-gray-400 hover:text-pink-400 transition-colors flex items-center gap-1"
                >
                  <span>✕</span> 清除记住的账号
                </button>
              )}
            </div>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm text-gray-500 ml-1">密码</label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-100 text-gray-700 text-sm focus:outline-none focus:border-pink-300 transition-colors placeholder:text-gray-300"
              style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)' }}
            />
            {tab === 'login' && (
              <div className="text-right mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs text-pink-400 hover:text-pink-500 font-medium transition-colors"
                >
                  忘记密码？
                </Link>
              </div>
            )}
          </div>

          {tab === 'login' && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    if (!checked) setRememberPassword(false);
                  }}
                  className="peer sr-only"
                />
                <span
                  className="w-4 h-4 rounded-md border border-pink-200 flex items-center justify-center transition-all peer-checked:border-pink-300"
                  style={{
                    background: rememberMe
                      ? 'linear-gradient(135deg, #FFB8C9 0%, #FFC9DE 100%)'
                      : 'white',
                    boxShadow: rememberMe
                      ? '0 2px 6px rgba(255, 180, 200, 0.4), inset 0 1px 2px rgba(255,255,255,0.6)'
                      : 'inset 0 1px 2px rgba(255, 180, 200, 0.1)',
                  }}
                >
                  {rememberMe && (
                    <span className="text-white text-xs font-bold leading-none">✓</span>
                  )}
                </span>
                <span className="text-xs text-gray-500">记住账号</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberPassword(checked);
                    if (checked) setRememberMe(true);
                  }}
                  className="peer sr-only"
                />
                <span
                  className="w-4 h-4 rounded-md border border-pink-200 flex items-center justify-center transition-all peer-checked:border-pink-300"
                  style={{
                    background: rememberPassword
                      ? 'linear-gradient(135deg, #FFB8C9 0%, #FFC9DE 100%)'
                      : 'white',
                    boxShadow: rememberPassword
                      ? '0 2px 6px rgba(255, 180, 200, 0.4), inset 0 1px 2px rgba(255,255,255,0.6)'
                      : 'inset 0 1px 2px rgba(255, 180, 200, 0.1)',
                  }}
                >
                  {rememberPassword && (
                    <span className="text-white text-xs font-bold leading-none">✓</span>
                  )}
                </span>
                <span className="text-xs text-gray-500">记住密码</span>
              </label>
              {savedEmail && savedEmail !== email && (
                <button
                  type="button"
                  onClick={handleQuickLogin}
                  className="text-xs text-pink-400 hover:text-pink-500 font-medium transition-colors ml-auto"
                >
                  快速登录
                </button>
              )}
            </div>
          )}

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
          {tab === 'login' && (
            <p className="text-xs text-gray-400 text-center mt-2">
              密码仅保存在本设备浏览器中
            </p>
          )}
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
            window.location.replace('/');
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

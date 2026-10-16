import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { resetPassword } from '@client/src/api/auth';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('重置令牌不能为空');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('新密码至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword({ token: token.trim(), newPassword });
      setSuccess(true);
      toast.success(data.message);
      setTimeout(() => {
        navigate('/login', { state: { resetSuccess: true } });
      }, 1500);
    } catch (err: unknown) {
      logger.error('重置密码失败', err);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message
        || '重置失败，请稍后重试';
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
          <div className="text-4xl mb-3">🔐</div>
          <h1
            className="text-2xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"
            style={{ letterSpacing: '0.5px' }}
          >
            重置密码
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {success ? '密码重置成功' : '设置你的新密码'}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromUrl && (
              <div>
                <label className="block text-sm text-gray-500 mb-1.5 ml-1">重置令牌</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="请输入重置令牌"
                  className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-100 text-gray-700 text-sm focus:outline-none focus:border-pink-300 transition-colors placeholder:text-gray-300"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)' }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 ml-1">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-pink-100 text-gray-700 text-sm focus:outline-none focus:border-pink-300 transition-colors placeholder:text-gray-300"
                style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.1)' }}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 ml-1">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
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
                background: 'linear-gradient(135deg, #FFB8C9 0%, #FFC9DE 100%)',
                boxShadow: '0 6px 20px rgba(255, 180, 200, 0.5), inset 0 2px 4px rgba(255,255,255,0.6)',
              }}
            >
              {loading ? '请稍候...' : '重置密码'}
            </button>
          </form>
        ) : (
          <div
            className="p-6 rounded-2xl bg-green-50/80 text-center"
            style={{ boxShadow: 'inset 0 2px 4px rgba(180, 231, 212, 0.3)' }}
          >
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm text-green-600 font-medium">
              密码已重置，即将跳转到登录页
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          <Link
            to="/login"
            className="text-pink-400 hover:text-pink-500 font-medium"
          >
            ← 返回登录
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

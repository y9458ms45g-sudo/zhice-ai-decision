import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { forgotPassword } from '@client/src/api/auth';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('邮箱格式不正确');
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPassword({ email });
      if (data.resetToken) setResetToken(data.resetToken);
      if (data.resetUrl) setResetUrl(data.resetUrl);
      setSubmitted(true);
      toast.success(data.message);
    } catch (err: unknown) {
      logger.error('找回密码失败', err);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message
        || '发送失败，请稍后重试';
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
          <div className="text-4xl mb-3">🔑</div>
          <h1
            className="text-2xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"
            style={{ letterSpacing: '0.5px' }}
          >
            找回密码
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {submitted
              ? '请查收重置邮件'
              : '输入邮箱，我们将发送重置链接'}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1.5 ml-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入注册邮箱"
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
              {loading ? '请稍候...' : '发送重置链接'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl bg-pink-50/80"
              style={{ boxShadow: 'inset 0 2px 4px rgba(255, 180, 200, 0.15)' }}
            >
              {resetToken ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="text-pink-500 font-medium">【开发环境提示】</span>
                    重置令牌已生成：
                  </p>
                  <div className="bg-white rounded-xl p-3 text-xs font-mono text-gray-600 break-all border border-pink-100">
                    {resetToken}
                  </div>
                  <p className="text-sm text-gray-600 pt-1">
                    点击下方链接重置密码：
                  </p>
                  <Link
                    to={resetUrl}
                    className="block text-sm text-pink-500 font-medium underline break-all hover:text-pink-600 transition-colors"
                  >
                    {resetUrl}
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center">
                  重置链接已发送到邮箱，请查收并点击链接重置密码。
                </p>
              )}
            </div>

            {resetUrl && (
              <button
                type="button"
                onClick={() => navigate(resetUrl)}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all duration-200 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #DCC9F7 0%, #C7DEFA 100%)',
                  boxShadow: '0 6px 20px rgba(200, 180, 255, 0.5), inset 0 2px 4px rgba(255,255,255,0.6)',
                }}
              >
                立即重置密码 →
              </button>
            )}
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

export default ForgotPasswordPage;

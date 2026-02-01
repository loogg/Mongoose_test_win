import { useState } from 'preact/hooks';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { Button } from '../components/ui';

export function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorKey(null);

    // Custom validation
    if (!username.trim() || !password.trim()) {
      setErrorKey('login.required');
      return;
    }

    setLoading(true);

    try {
      await login(username, password);
      window.location.href = '/';
    } catch {
      setErrorKey('login.error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

      {/* Language Switcher */}
      <div class="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setLang('zh')}
          class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            lang === 'zh'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          中文
        </button>
        <button
          onClick={() => setLang('en')}
          class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            lang === 'en'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          EN
        </button>
      </div>

      <div class="relative w-full max-w-md">
        {/* Glow Effect */}
        <div class="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-30"></div>

        {/* Card */}
        <div class="relative bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
              <span class="text-3xl">🎛️</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">{t('login.title')}</h1>
            <p class="text-gray-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {t('login.username')}
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  key={`username-${lang}`}
                  type="text"
                  value={username}
                  onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  placeholder={t('login.usernamePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {t('login.password')}
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  key={`password-${lang}`}
                  type="password"
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  placeholder={t('login.passwordPlaceholder')}
                />
              </div>
            </div>

            {errorKey && (
              <div class="bg-red-50 text-red-600 text-sm text-center py-3 px-4 rounded-xl border border-red-100">
                ⚠️ {t(errorKey as any)}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full py-3 text-base">
              {t('login.submit')}
            </Button>
          </form>

          {/* Demo Accounts - 仅开发模式显示 */}
          {import.meta.env.DEV && (
            <div class="mt-6 pt-6 border-t border-gray-100">
              <p class="text-xs text-gray-400 text-center mb-3">开发模式 - 快速登录</p>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                  class="py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setUsername('user'); setPassword('user123'); }}
                  class="py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => { setUsername('guest'); setPassword('guest'); }}
                  class="py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  Guest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

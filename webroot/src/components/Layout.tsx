import type { ComponentChildren } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';

// 权限级别常量
const PERM_READONLY = 1;  // Guest
const PERM_USER = 3;      // User
const PERM_ADMIN = 7;     // Admin

interface LayoutProps {
  children: ComponentChildren;
}

export function Layout({ children }: LayoutProps) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // 监听路由变化
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 导航点击处理
  const handleNavClick = (path: string) => {
    setCurrentPath(path);
  };

  // 根据权限级别定义可访问的导航项
  const allNavItems = [
    { path: '/', label: t('nav.dashboard'), icon: '📊', minLevel: PERM_READONLY },
    { path: '/settings', label: t('nav.settings'), icon: '⚙️', minLevel: PERM_USER },
    { path: '/firmware', label: t('nav.firmware'), icon: '📦', minLevel: PERM_ADMIN },
    { path: '/debug', label: t('nav.debug'), icon: '🔧', minLevel: PERM_ADMIN },
    { path: '/log', label: t('nav.log'), icon: '📋', minLevel: PERM_ADMIN },
  ];

  // 过滤出当前用户有权限访问的导航项
  const navItems = allNavItems.filter(item => (user?.level ?? 0) >= item.minLevel);

  return (
    <div class="h-screen flex bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside class="w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col shadow-xl h-screen">
        {/* Logo Area */}
        <div class="p-6 border-b border-slate-700 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-lg">
              🎛️
            </div>
            <div>
              <h1 class="font-bold text-lg">{t('login.title')}</h1>
              <p class="text-xs text-slate-400">{t('login.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={() => handleNavClick(item.path)}
              class={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentPath === item.path
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span class="text-lg">{item.icon}</span>
              <span class="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User Section */}
        <div class="p-4 border-t border-slate-700 flex-shrink-0">
          {user && (
            <div class="space-y-3">
              <div class="flex items-center gap-3 px-2">
                <div class="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-sm font-bold shadow">
                  {user.name[0].toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{user.name}</p>
                  <p class="text-xs text-slate-400">
                    {user.level === 7 ? 'Admin' : user.level === 3 ? 'User' : 'Guest'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                class="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🚪</span>
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div class="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div>
            <h2 class="text-xl font-semibold text-gray-800">
              {navItems.find(item => item.path === currentPath)?.label || t('nav.dashboard')}
            </h2>
            <p class="text-sm text-gray-500">
              {new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div class="flex items-center gap-4">
            {/* Language Switcher */}
            <div class="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLang('zh')}
                class={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  lang === 'zh'
                    ? 'bg-white text-gray-800 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLang('en')}
                class={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  lang === 'en'
                    ? 'bg-white text-gray-800 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main class="flex-1 p-6 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <footer class="bg-white border-t border-gray-200 px-6 py-3 text-center text-sm text-gray-400 flex-shrink-0">
          © 2026 Device Console. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

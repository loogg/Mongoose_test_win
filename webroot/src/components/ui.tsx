import type { ComponentChildren } from 'preact';

interface CardProps {
  title?: string;
  children: ComponentChildren;
  className?: string;
  icon?: string;
}

export function Card({ title, children, className = '', icon }: CardProps) {
  return (
    <div class={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow ${className}`}>
      {title && (
        <div class="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 class="text-base font-semibold text-gray-800 flex items-center gap-2">
            {icon && <span>{icon}</span>}
            {title}
          </h3>
        </div>
      )}
      <div class="p-5">
        {children}
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string | number;
  icon?: string;
}

export function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div class="flex justify-between items-center py-3 border-b border-gray-50 last:border-b-0">
      <span class="text-gray-500 flex items-center gap-2">
        {icon && <span class="text-sm">{icon}</span>}
        {label}
      </span>
      <span class="font-medium text-gray-800">{value}</span>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercent?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'auto';
}

export function ProgressBar({ value, max, label, showPercent = true, color = 'auto' }: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  const getColor = () => {
    if (color !== 'auto') {
      return {
        blue: 'from-blue-400 to-blue-600',
        green: 'from-emerald-400 to-emerald-600',
        yellow: 'from-yellow-400 to-yellow-600',
        red: 'from-red-400 to-red-600',
      }[color];
    }
    if (percent > 80) return 'from-red-400 to-red-600';
    if (percent > 60) return 'from-yellow-400 to-yellow-600';
    return 'from-blue-400 to-blue-600';
  };

  return (
    <div class="space-y-2">
      {label && (
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">{label}</span>
          {showPercent && <span class="font-medium text-gray-800">{percent}%</span>}
        </div>
      )}
      <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          class={`h-full rounded-full bg-gradient-to-r ${getColor()} transition-all duration-300 ease-out`}
          style={{ width: `${percent}%`, minWidth: percent > 0 ? '8px' : '0' }}
        />
      </div>
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <label class="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        class={`relative w-11 h-6 rounded-full transition-all duration-200 ${
          checked
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-inner'
            : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'group-hover:shadow-md'}`}
      >
        <span
          class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
      {label && <span class="text-gray-700 text-sm">{label}</span>}
    </label>
  );
}

interface ButtonProps {
  children: ComponentChildren;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  icon,
}: ButtonProps) {
  const sizeClass = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }[size];

  const variantClass = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md shadow-blue-500/20',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-sm hover:shadow-md shadow-red-500/20',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-800',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      class={`rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${sizeClass} ${variantClass} ${className}`}
    >
      {loading ? (
        <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'connecting' | 'success' | 'warning' | 'error';
  label: string;
  pulse?: boolean;
}

export function StatusBadge({ status, label, pulse = false }: StatusBadgeProps) {
  const config = {
    online: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    success: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    offline: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    connecting: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    error: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  }[status];

  return (
    <span class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span class={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  const colorClass = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  }[color];

  return (
    <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm text-gray-500">{title}</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {trend && (
            <p class={`text-xs mt-2 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div class={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

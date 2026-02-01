import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { getDashboard, getTool, syncTime, createStatusWebSocket } from '../api';
import { Card, InfoRow, ProgressBar, StatusBadge, Button, StatCard } from '../components/ui';
import type { DashboardData, ToolInfo, StatusPush } from '../types';

// 权限级别常量
const PERM_ADMIN = 7;

export function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tool, setTool] = useState<ToolInfo | null>(null);
  const [status, setStatus] = useState<StatusPush['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    Promise.all([getDashboard(), getTool()])
      .then(([dashRes, toolRes]) => {
        if (dashRes.ack && dashRes.data) setDashboard(dashRes.data);
        if (toolRes.ack && toolRes.data) setTool(toolRes.data);
      })
      .finally(() => setLoading(false));

    // Connect WebSocket for real-time updates
    const ws = createStatusWebSocket((data) => {
      const msg = data as StatusPush;
      if (msg.type === 'status') {
        setStatus(msg.data);
        // Update tool state from WebSocket
        if (msg.data.tool_change) {
          getTool().then((res) => {
            if (res.ack && res.data) setTool(res.data);
          });
        }
      }
    });

    return () => ws.close();
  }, []);

  const handleSyncTime = async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    await syncTime(timestamp);
  };

  const getToolStatus = (state: number): 'online' | 'offline' | 'connecting' => {
    switch (state) {
      case 2: return 'online';
      case 1: return 'connecting';
      default: return 'offline';
    }
  };

  const getToolStatusLabel = (state: number): string => {
    switch (state) {
      case 2: return t('dashboard.tool.online');
      case 1: return t('dashboard.tool.connecting');
      default: return t('dashboard.tool.offline');
    }
  };

  const formatTime = (timestamp: number, tzOffset: number): string => {
    // timestamp 是 UTC 秒，加上时区偏移后，使用 UTC 方法显示避免浏览器再次转换时区
    const date = new Date((timestamp + tzOffset * 3600) * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatTimeOnly = (timestamp: number, tzOffset: number): string => {
    const date = new Date((timestamp + tzOffset * 3600) * 1000);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center h-64">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Stats Row */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.memory.sram')}
          value={status ? `${status.sram_used}%` : '-'}
          icon="💾"
          color={status && status.sram_used > 80 ? 'red' : status && status.sram_used > 60 ? 'yellow' : 'blue'}
        />
        <StatCard
          title={t('dashboard.memory.sdram')}
          value={status ? `${status.sdram_used}%` : '-'}
          icon="🧠"
          color={status && status.sdram_used > 80 ? 'red' : status && status.sdram_used > 60 ? 'yellow' : 'green'}
        />
        <StatCard
          title={t('dashboard.time')}
          value={status ? formatTimeOnly(status.time, status.tz_offset) : '-'}
          icon="🕐"
          color="purple"
        />
        <StatCard
          title={t('dashboard.tool')}
          value={getToolStatusLabel(status?.tool_state ?? tool?.state ?? 0)}
          icon="🔧"
          color={status?.tool_state === 2 ? 'green' : status?.tool_state === 1 ? 'yellow' : 'red'}
        />
      </div>

      {/* Main Content */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Info */}
        <Card title={t('dashboard.device')} icon="📱">
          {dashboard && (
            <>
              <InfoRow label={t('dashboard.device.name')} value={dashboard.device.name} icon="🏷️" />
              <InfoRow label={t('dashboard.device.firmware')} value={dashboard.device.firmware} icon="💿" />
              <InfoRow label={t('dashboard.device.hardware')} value={dashboard.device.hardware} icon="🔩" />
              <InfoRow label={t('dashboard.device.serial')} value={dashboard.device.serial} icon="🔢" />
            </>
          )}
        </Card>

        {/* Network Info */}
        <Card title={t('dashboard.network')} icon="🌐">
          {dashboard && (
            <>
              <InfoRow label={t('dashboard.network.ip')} value={dashboard.network.ip} icon="📍" />
              <InfoRow label={t('dashboard.network.mac')} value={dashboard.network.mac} icon="🔗" />
            </>
          )}
        </Card>

        {/* Tool Status */}
        <Card title={t('dashboard.tool')} icon="🔧">
          {tool && (
            <>
              <div class="flex items-center gap-2 mb-4">
                <StatusBadge
                  status={getToolStatus(status?.tool_state ?? tool.state)}
                  label={getToolStatusLabel(status?.tool_state ?? tool.state)}
                  pulse={status?.tool_state === 1}
                />
              </div>
              {tool.state > 0 && (
                <>
                  <InfoRow label={t('dashboard.device.name')} value={tool.name || '-'} icon="🏷️" />
                  <InfoRow label={t('dashboard.device.firmware')} value={tool.firmware || '-'} icon="💿" />
                  <InfoRow label={t('dashboard.device.hardware')} value={tool.hardware || '-'} icon="🔩" />
                </>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Memory & Time Row */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage */}
        <Card title={t('dashboard.memory')} icon="📊">
          {status && (
            <div class="space-y-5">
              <ProgressBar
                label={t('dashboard.memory.sram')}
                value={status.sram_used}
                max={100}
              />
              <ProgressBar
                label={t('dashboard.memory.sdram')}
                value={status.sdram_used}
                max={100}
              />
            </div>
          )}
          {!status && (
            <div class="flex items-center justify-center h-24">
              <div class="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </Card>

        {/* System Time - 只有 Admin 可以同步时间 */}
        <Card title={t('dashboard.time')} icon="🕐">
          {status && (
            <div class="flex items-center justify-between">
              <div>
                <div class="text-3xl font-mono font-bold text-gray-800">
                  {formatTimeOnly(status.time, status.tz_offset)}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  {formatTime(status.time, status.tz_offset).split(' ')[0]}
                </div>
              </div>
              {user && user.level >= PERM_ADMIN && (
                <Button onClick={handleSyncTime} variant="secondary" icon="🔄">
                  {t('dashboard.syncTime')}
                </Button>
              )}
            </div>
          )}
          {!status && (
            <div class="flex items-center justify-center h-24">
              <div class="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

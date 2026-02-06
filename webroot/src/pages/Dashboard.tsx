import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { getDashboard, getTool, syncTime } from '../api';
import { useWebSocket } from '../components/WebSocket';
import { Card, InfoRow, StatusBadge, Button, StatCard } from '../components/ui';
import { MemoryChart } from '../components/MemoryChart';
import { useToast } from '../components/Toast';
import type { DashboardData, ToolInfo } from '../types';

// 权限级别常量
const PERM_ADMIN = 7;

export function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { status, updateStatus } = useWebSocket();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tool, setTool] = useState<ToolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Memory usage history for charts
  const [memoryHistory, setMemoryHistory] = useState({
    sram: [] as Array<{ value: number; timestamp: number }>,
    sdram: [] as Array<{ value: number; timestamp: number }>
  });

  useEffect(() => {
    // Fetch all dashboard data in one request (includes tool and initial status)
    getDashboard()
      .then((res) => {
        if (res.ack && res.data) {
          setDashboard(res.data);
          // Initialize tool from dashboard response
          setTool(res.data.tool);
          // Update status in WebSocket context to refresh header immediately
          if (res.data.status) {
            // 直接更新WebSocket状态，让Layout组件立即获取最新的时间数据
            updateStatus({ ...res.data.status });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [updateStatus]);

  // Tool state update when tool_change is true
  useEffect(() => {
    if (status?.tool_change) {
      getTool().then((res) => {
        if (res.ack && res.data) setTool(res.data);
      });
    }
  }, [status?.tool_change]);

  // Update memory usage history when status changes
  useEffect(() => {
    if (status) {
      setMemoryHistory(prev => {
        const newSram = [...prev.sram, { value: status.sram_used, timestamp: status.timestamp }];
        const newSdram = [...prev.sdram, { value: status.sdram_used, timestamp: status.timestamp }];

        // Keep only the last 200 data points
        return {
          sram: newSram.slice(-200),
          sdram: newSdram.slice(-200)
        };
      });
    }
  }, [status]);

  const handleSyncTime = async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      await syncTime(timestamp);
      showToast(t('dashboard.syncTimeSuccess'), 'success');
    } catch (error) {
      showToast(t('dashboard.syncTimeFailed'), 'error');
    }
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
          value={status ? formatTimeOnly(status.timestamp, status.tz_offset) : '-'}
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
            <div class="space-y-6">
              {/* SRAM */}
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-3">{t('dashboard.memory.sram')}</h4>
                <div class="space-y-3">
                  {/* Used */}
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-gray-500">{t('dashboard.memory.used')}</span>
                      <span class="font-medium text-gray-700">{status.sram_used}%</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out`}
                        style={{ width: `${status.sram_used}%`, minWidth: status.sram_used > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                  {/* Max */}
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-gray-500">{t('dashboard.memory.max_used')}</span>
                      <span class="font-medium text-gray-700">{status.sram_max}%</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300 ease-out`}
                        style={{ width: `${status.sram_max}%`, minWidth: status.sram_max > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SDRAM */}
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-3">{t('dashboard.memory.sdram')}</h4>
                <div class="space-y-3">
                  {/* Used */}
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-gray-500">{t('dashboard.memory.used')}</span>
                      <span class="font-medium text-gray-700">{status.sdram_used}%</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300 ease-out`}
                        style={{ width: `${status.sdram_used}%`, minWidth: status.sdram_used > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                  {/* Max */}
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-gray-500">{t('dashboard.memory.max_used')}</span>
                      <span class="font-medium text-gray-700">{status.sdram_max}%</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300 ease-out`}
                        style={{ width: `${status.sdram_max}%`, minWidth: status.sdram_max > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
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
            <div class="space-y-4">
              <div>
                <div class="text-3xl font-mono font-bold text-gray-800">
                  {formatTimeOnly(status.timestamp, status.tz_offset)}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  {formatTime(status.timestamp, status.tz_offset).split(' ')[0]}
                </div>
              </div>
              {user && user.level >= PERM_ADMIN && (
                <div class="flex justify-start">
                  <Button onClick={handleSyncTime} variant="secondary" icon="🔄">
                    {t('dashboard.syncTime')}
                  </Button>
                </div>
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

      {/* Memory Usage Curves */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SRAM Usage Curve */}
        <Card title={t('dashboard.memory.sram')} icon="📈">
          {status && memoryHistory.sram.length > 0 ? (
            <div class="h-72 w-full bg-gradient-to-br from-blue-50 via-blue-100/30 to-white rounded-xl p-5 shadow-md border border-blue-100">
              <MemoryChart
                data={memoryHistory.sram.map((d, i) => ({ index: i, value: d.value, timestamp: d.timestamp }))}
                color="rgb(59, 130, 246)"
                label={t('dashboard.memory.sram')}
                unit="%"
                tzOffset={status.tz_offset}
              />
            </div>
          ) : (
            <div class="flex items-center justify-center h-32">
              <div class="text-gray-500 text-sm">{t('dashboard.memory.no_data')}</div>
            </div>
          )}
        </Card>

        {/* SDRAM Usage Curve */}
        <Card title={t('dashboard.memory.sdram')} icon="📈">
          {status && memoryHistory.sdram.length > 0 ? (
            <div class="h-72 w-full bg-gradient-to-br from-green-50 via-green-100/30 to-white rounded-xl p-5 shadow-md border border-green-100">
              <MemoryChart
                data={memoryHistory.sdram.map((d, i) => ({ index: i, value: d.value, timestamp: d.timestamp }))}
                color="rgb(34, 197, 94)"
                label={t('dashboard.memory.sdram')}
                unit="%"
                tzOffset={status.tz_offset}
              />
            </div>
          ) : (
            <div class="flex items-center justify-center h-32">
              <div class="text-gray-500 text-sm">{t('dashboard.memory.no_data')}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

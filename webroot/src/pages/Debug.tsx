import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { getDebug, updateDebug, saveDebug } from '../api';
import { Card, Switch, Button, StatusBadge } from '../components/ui';
import type { DebugData } from '../types';

export function DebugPage() {
  const { t } = useI18n();
  const [debug, setDebug] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [udpTargetIp, setUdpTargetIp] = useState('');

  useEffect(() => {
    loadDebug();
  }, []);

  const loadDebug = async () => {
    setLoading(true);
    const res = await getDebug();
    if (res.ack && res.data) {
      setDebug(res.data);
      setUdpTargetIp(res.data.udp_target_ip);
    }
    setLoading(false);
  };

  const handleUpdateCli = async (key: keyof DebugData['cli'], value: boolean) => {
    setSaving(true);
    await updateDebug({ cli: { [key]: value } } as Partial<DebugData>);
    await loadDebug();
    setSaving(false);
  };

  const handleUpdateUdpForward = async (key: keyof DebugData['udp_forward'], value: boolean) => {
    setSaving(true);
    await updateDebug({ udp_forward: { [key]: value } } as Partial<DebugData>);
    await loadDebug();
    setSaving(false);
  };

  const handleUpdateOpLog = async (key: keyof DebugData['op_log'], value: boolean) => {
    setSaving(true);
    await updateDebug({ op_log: { [key]: value } } as Partial<DebugData>);
    await loadDebug();
    setSaving(false);
  };

  const handleUpdateUdpTarget = async () => {
    setSaving(true);
    await updateDebug({ udp_target_ip: udpTargetIp } as Partial<DebugData>);
    await loadDebug();
    setSaving(false);
  };

  const handleSaveDebug = async () => {
    setSaving(true);
    await saveDebug();
    setSaving(false);
  };

  const udpForwardItems = [
    { key: 'tool_rx', labelKey: 'debug.udpForward.toolRx', icon: '📥' },
    { key: 'tool_tx', labelKey: 'debug.udpForward.toolTx', icon: '📤' },
    { key: 'screen_rx', labelKey: 'debug.udpForward.screenRx', icon: '📥' },
    { key: 'screen_tx', labelKey: 'debug.udpForward.screenTx', icon: '📤' },
    { key: 'op1_rx', labelKey: 'debug.udpForward.op1Rx', icon: '📥' },
    { key: 'op1_tx', labelKey: 'debug.udpForward.op1Tx', icon: '📤' },
    { key: 'op2_rx', labelKey: 'debug.udpForward.op2Rx', icon: '📥' },
    { key: 'op2_tx', labelKey: 'debug.udpForward.op2Tx', icon: '📤' },
    { key: 'mbtcp1_rx', labelKey: 'debug.udpForward.mbtcp1Rx', icon: '📥' },
    { key: 'mbtcp1_tx', labelKey: 'debug.udpForward.mbtcp1Tx', icon: '📤' },
    { key: 'mbtcp2_rx', labelKey: 'debug.udpForward.mbtcp2Rx', icon: '📥' },
    { key: 'mbtcp2_tx', labelKey: 'debug.udpForward.mbtcp2Tx', icon: '📤' },
    { key: 'mbtcp3_rx', labelKey: 'debug.udpForward.mbtcp3Rx', icon: '📥' },
    { key: 'mbtcp3_tx', labelKey: 'debug.udpForward.mbtcp3Tx', icon: '📤' },
    { key: 'udp_log', labelKey: 'debug.udpForward.udpLog', icon: '📋' },
  ] as const;

  const opLogItems = [
    { key: 'io', labelKey: 'debug.opLog.io', icon: '🔌' },
    { key: 'mbtcp', labelKey: 'debug.opLog.mbtcp', icon: '🌐' },
    { key: 'op', labelKey: 'debug.opLog.op', icon: '🎮' },
    { key: 'tool', labelKey: 'debug.opLog.tool', icon: '🔧' },
    { key: 'screen', labelKey: 'debug.opLog.screen', icon: '📺' },
  ] as const;

  if (loading) {
    return (
      <div class="flex items-center justify-center h-64">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* TCP Connections */}
      <Card title={t('debug.tcpConnections')} icon="🔗">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 class="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              {t('debug.tcpConnections.custom')}
            </h4>
            <div class="space-y-2">
              {debug?.tcp_connections.custom.map((conn) => (
                <div key={conn.id} class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span class="text-gray-500 font-mono text-sm">#{conn.id}</span>
                  <StatusBadge
                    status={conn.connected ? 'online' : 'offline'}
                    label={conn.connected ? t('debug.connected') : t('debug.disconnected')}
                    pulse={conn.connected}
                  />
                  {conn.connected && (
                    <span class="font-mono text-sm text-gray-700">{conn.ip}:{conn.port}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 class="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-purple-500"></span>
              {t('debug.tcpConnections.mbtcp')}
            </h4>
            <div class="space-y-2">
              {debug?.tcp_connections.mbtcp.map((conn) => (
                <div key={conn.id} class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span class="text-gray-500 font-mono text-sm">#{conn.id}</span>
                  <StatusBadge
                    status={conn.connected ? 'online' : 'offline'}
                    label={conn.connected ? t('debug.connected') : t('debug.disconnected')}
                    pulse={conn.connected}
                  />
                  {conn.connected && (
                    <span class="font-mono text-sm text-gray-700">{conn.ip}:{conn.port}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* UDP Target & CLI */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={t('debug.udpTarget')} icon="📡">
          <div class="flex gap-3">
            <input
              type="text"
              value={udpTargetIp}
              onChange={(e) => setUdpTargetIp((e.target as HTMLInputElement).value)}
              class="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="192.168.1.100"
            />
            <Button onClick={handleUpdateUdpTarget} loading={saving} icon="✏️">
              {t('common.modify')}
            </Button>
          </div>
        </Card>

        <Card title={t('debug.cli')} icon="💻">
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">{t('debug.cli.serialLog')}</span>
              <Switch
                checked={debug?.cli.serial_log ?? false}
                onChange={(v) => handleUpdateCli('serial_log', v)}
                disabled={saving}
              />
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">{t('debug.cli.telnetAuth')}</span>
              <Switch
                checked={debug?.cli.telnet_auth ?? false}
                onChange={(v) => handleUpdateCli('telnet_auth', v)}
                disabled={saving}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* UDP Forward */}
      <Card title={t('debug.udpForward')} icon="📦">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {udpForwardItems.map((item) => (
            <div key={item.key} class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-sm text-gray-700 flex items-center gap-2">
                <span>{item.icon}</span>
                {t(item.labelKey)}
              </span>
              <Switch
                checked={debug?.udp_forward[item.key] ?? false}
                onChange={(v) => handleUpdateUdpForward(item.key, v)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Operation Log */}
      <Card title={t('debug.opLog')} icon="📝">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {opLogItems.map((item) => (
            <div key={item.key} class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="text-sm text-gray-700 flex items-center gap-2">
                <span>{item.icon}</span>
                {t(item.labelKey)}
              </span>
              <Switch
                checked={debug?.op_log[item.key] ?? false}
                onChange={(v) => handleUpdateOpLog(item.key, v)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div class="flex justify-end gap-3">
        <Button onClick={loadDebug} variant="secondary" icon="🔄">
          {t('common.refresh')}
        </Button>
        <Button onClick={handleSaveDebug} loading={saving} icon="💾">
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import {
  getSettings,
  updateSystemSettings,
  updateVersionSettings,
  updateNetworkSettings,
} from '../api';
import { Card, InfoRow, Button } from '../components/ui';
import type { SettingsData } from '../types';

// 权限级别常量
const PERM_USER = 3;      // User - 可修改系统设置
const PERM_ADMIN = 7;     // Admin - 可修改所有设置

export function SettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editSystem, setEditSystem] = useState(false);
  const [editVersion, setEditVersion] = useState(false);
  const [editNetwork, setEditNetwork] = useState(false);

  // Form values
  const [systemForm, setSystemForm] = useState({
    language: 0,
    unit: 0,
    start_mode: 2,
    activation_mode: 3,
    barcode_mode: 0,
    timezone: 8,
  });

  const [versionForm, setVersionForm] = useState({
    name: '',
    hardware: '',
    serial: '',
  });

  const [networkForm, setNetworkForm] = useState({
    ip: '',
    mbtcp_port: 502,
    custom_port: 8080,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const res = await getSettings();
    if (res.ack && res.data) {
      setSettings(res.data);
      setSystemForm(res.data.system);
      setVersionForm({
        name: res.data.ver.name,
        hardware: res.data.ver.hardware,
        serial: res.data.ver.serial,
      });
      setNetworkForm(res.data.network);
    }
    setLoading(false);
  };

  const handleSaveSystem = async () => {
    setSaving(true);
    await updateSystemSettings(systemForm);
    setEditSystem(false);
    await loadSettings();
    setSaving(false);
  };

  const handleSaveVersion = async () => {
    setSaving(true);
    await updateVersionSettings(versionForm);
    setEditVersion(false);
    await loadSettings();
    setSaving(false);
  };

  const handleSaveNetwork = async () => {
    setSaving(true);
    await updateNetworkSettings(networkForm);
    setEditNetwork(false);
    await loadSettings();
    setSaving(false);
  };

  const languageOptions = [
    { value: 0, labelKey: 'settings.language.zh' as const },
    { value: 1, labelKey: 'settings.language.en' as const },
  ];

  const unitOptions = [
    { value: 0, label: 'Nm' },
    { value: 1, label: 'kgf.cm' },
    { value: 2, label: 'lbf.in' },
  ];

  const startModeOptions = [
    { value: 2, label: 'IO' },
    { value: 7, label: 'Modbus TCP' },
    { value: 8, label: 'OP' },
  ];

  const activationModeOptions = [
    { value: 2, label: 'Modbus TCP' },
    { value: 3, label: 'IO' },
    { value: 4, labelKey: 'settings.activationMode.barcode' as const },
    { value: 5, labelKey: 'settings.activationMode.screen' as const },
  ];

  if (loading) {
    return (
      <div class="flex items-center justify-center h-64">
        <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white";
  const selectClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white appearance-none cursor-pointer";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5";

  // 权限判断
  const canEditSystem = (user?.level ?? 0) >= PERM_USER;
  const canEditVersion = (user?.level ?? 0) >= PERM_ADMIN;
  const canEditNetwork = (user?.level ?? 0) >= PERM_ADMIN;

  // 辅助函数：获取选项的显示文本
  const getOptionLabel = (option: { label?: string; labelKey?: string } | undefined): string => {
    if (!option) return '-';
    if (option.labelKey) return t(option.labelKey as any);
    return option.label || '-';
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* System Settings */}
      <Card title={t('settings.system')} icon="⚙️">
        {!editSystem ? (
          <div>
            <InfoRow
              label={t('settings.system.language')}
              value={getOptionLabel(languageOptions.find((o) => o.value === settings?.system.language))}
              icon="🌍"
            />
            <InfoRow
              label={t('settings.system.unit')}
              value={getOptionLabel(unitOptions.find((o) => o.value === settings?.system.unit))}
              icon="📐"
            />
            <InfoRow
              label={t('settings.system.startMode')}
              value={getOptionLabel(startModeOptions.find((o) => o.value === settings?.system.start_mode))}
              icon="🚀"
            />
            <InfoRow
              label={t('settings.system.activationMode')}
              value={getOptionLabel(activationModeOptions.find((o) => o.value === settings?.system.activation_mode))}
              icon="🔑"
            />
            <InfoRow label={t('settings.system.timezone')} value={`UTC${(settings?.system.timezone ?? 0) >= 0 ? '+' : ''}${settings?.system.timezone ?? 0}`} icon="🌐" />
            {canEditSystem && (
              <div class="mt-5 pt-4 border-t border-gray-100">
                <Button onClick={() => setEditSystem(true)} icon="✏️">{t('common.edit')}</Button>
              </div>
            )}
          </div>
        ) : (
          <div class="space-y-4">
            <div>
              <label class={labelClass}>{t('settings.system.language')}</label>
              <select
                value={systemForm.language}
                onChange={(e) => setSystemForm({ ...systemForm, language: Number((e.target as HTMLSelectElement).value) })}
                class={selectClass}
              >
                {languageOptions.map((o) => (
                  <option key={o.value} value={o.value}>{getOptionLabel(o)}</option>
                ))}
              </select>
            </div>
            <div>
              <label class={labelClass}>{t('settings.system.unit')}</label>
              <select
                value={systemForm.unit}
                onChange={(e) => setSystemForm({ ...systemForm, unit: Number((e.target as HTMLSelectElement).value) })}
                class={selectClass}
              >
                {unitOptions.map((o) => (
                  <option key={o.value} value={o.value}>{getOptionLabel(o)}</option>
                ))}
              </select>
            </div>
            <div>
              <label class={labelClass}>{t('settings.system.timezone')}</label>
              <input
                type="number"
                value={systemForm.timezone}
                onChange={(e) => setSystemForm({ ...systemForm, timezone: Number((e.target as HTMLInputElement).value) })}
                class={inputClass}
                min="-12"
                max="14"
              />
            </div>
            <div class="flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSaveSystem} loading={saving} icon="💾">{t('common.save')}</Button>
              <Button variant="secondary" onClick={() => setEditSystem(false)} icon="❌">{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Version Info */}
      <Card title={t('settings.version')} icon="📋">
        {!editVersion ? (
          <div>
            <InfoRow label={t('dashboard.device.firmware')} value={settings?.ver.firmware || '-'} icon="💿" />
            <InfoRow label={t('dashboard.device.name')} value={settings?.ver.name || '-'} icon="🏷️" />
            <InfoRow label={t('dashboard.device.hardware')} value={settings?.ver.hardware || '-'} icon="🔩" />
            <InfoRow label={t('dashboard.device.serial')} value={settings?.ver.serial || '-'} icon="🔢" />
            {canEditVersion && (
              <div class="mt-5 pt-4 border-t border-gray-100">
                <Button onClick={() => setEditVersion(true)} icon="✏️">{t('common.edit')}</Button>
              </div>
            )}
          </div>
        ) : (
          <div class="space-y-4">
            <div>
              <label class={labelClass}>{t('dashboard.device.name')}</label>
              <input
                type="text"
                value={versionForm.name}
                onChange={(e) => setVersionForm({ ...versionForm, name: (e.target as HTMLInputElement).value })}
                class={inputClass}
              />
            </div>
            <div>
              <label class={labelClass}>{t('dashboard.device.hardware')}</label>
              <input
                type="text"
                value={versionForm.hardware}
                onChange={(e) => setVersionForm({ ...versionForm, hardware: (e.target as HTMLInputElement).value })}
                class={inputClass}
              />
            </div>
            <div>
              <label class={labelClass}>{t('dashboard.device.serial')}</label>
              <input
                type="text"
                value={versionForm.serial}
                onChange={(e) => setVersionForm({ ...versionForm, serial: (e.target as HTMLInputElement).value })}
                class={inputClass}
              />
            </div>
            <div class="flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSaveVersion} loading={saving} icon="💾">{t('common.save')}</Button>
              <Button variant="secondary" onClick={() => setEditVersion(false)} icon="❌">{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Network Settings */}
      <Card title={t('settings.network')} icon="🌐" className="lg:col-span-2">
        {!editNetwork ? (
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm text-gray-500 mb-1">{t('dashboard.network.ip')}</div>
              <div class="text-lg font-medium text-gray-800">{settings?.network.ip || '-'}</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm text-gray-500 mb-1">{t('settings.network.mbtcpPort')}</div>
              <div class="text-lg font-medium text-gray-800">{settings?.network.mbtcp_port || '-'}</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm text-gray-500 mb-1">{t('settings.network.customPort')}</div>
              <div class="text-lg font-medium text-gray-800">{settings?.network.custom_port || '-'}</div>
            </div>
            {canEditNetwork && (
              <div class="md:col-span-3 mt-2">
                <Button onClick={() => setEditNetwork(true)} icon="✏️">{t('common.edit')}</Button>
              </div>
            )}
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class={labelClass}>{t('dashboard.network.ip')}</label>
              <input
                type="text"
                value={networkForm.ip}
                onChange={(e) => setNetworkForm({ ...networkForm, ip: (e.target as HTMLInputElement).value })}
                class={inputClass}
              />
            </div>
            <div>
              <label class={labelClass}>{t('settings.network.mbtcpPort')}</label>
              <input
                type="number"
                value={networkForm.mbtcp_port}
                onChange={(e) => setNetworkForm({ ...networkForm, mbtcp_port: Number((e.target as HTMLInputElement).value) })}
                class={inputClass}
              />
            </div>
            <div>
              <label class={labelClass}>{t('settings.network.customPort')}</label>
              <input
                type="number"
                value={networkForm.custom_port}
                onChange={(e) => setNetworkForm({ ...networkForm, custom_port: Number((e.target as HTMLInputElement).value) })}
                class={inputClass}
              />
            </div>
            <div class="md:col-span-3 flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSaveNetwork} loading={saving} icon="💾">{t('common.save')}</Button>
              <Button variant="secondary" onClick={() => setEditNetwork(false)} icon="❌">{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

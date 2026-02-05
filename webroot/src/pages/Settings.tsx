import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { useToast } from '../components/Toast';
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
  const { showToast } = useToast();
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
  const [errors, setErrors] = useState<{ timezone?: string; mbtcp_port?: string; custom_port?: string; ip?: string }>({});

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

  // 监听编辑模式变化，进入编辑时检查范围并显示错误提示（不修改值）
  useEffect(() => {
    if (editSystem) {
      let value = systemForm.timezone;
      let error = '';

      // 检查输入是否为有效整数
      if (isNaN(value) || !Number.isInteger(value)) {
        error = t('settings.error.timezone.invalid');
      }
      // 检查范围
      else if (value < -12) {
        error = t('settings.error.timezone.min');
      } else if (value > 12) {
        error = t('settings.error.timezone.max');
      } else {
        error = '';
      }

      setErrors({ ...errors, timezone: error });
    }
  }, [t, editSystem, systemForm.timezone]);

  // 监听网络编辑模式变化，进入编辑时检查端口范围并显示错误提示（不修改值）
  useEffect(() => {
    if (editNetwork) {
      let ipError = '';
      let mbtcpPortError = '';
      let customPortError = '';

      // 检查IP地址格式
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (networkForm.ip === '') {
        ipError = t('settings.error.ip.required');
      } else if (!ipRegex.test(networkForm.ip)) {
        ipError = t('settings.error.ip.format');
      } else {
        ipError = '';
      }

      // 检查Modbus TCP端口
      if (isNaN(networkForm.mbtcp_port) || !Number.isInteger(networkForm.mbtcp_port)) {
        mbtcpPortError = t('settings.error.port.invalid');
      } else if (networkForm.mbtcp_port < 500 || networkForm.mbtcp_port > 65535) {
        mbtcpPortError = t('settings.error.port.range');
      } else {
        mbtcpPortError = '';
      }

      // 检查自定义端口
      if (isNaN(networkForm.custom_port) || !Number.isInteger(networkForm.custom_port)) {
        customPortError = t('settings.error.port.invalid');
      } else if (networkForm.custom_port < 500 || networkForm.custom_port > 65535) {
        customPortError = t('settings.error.port.range');
      } else {
        customPortError = '';
      }

      // 检查端口不重复
      if (!mbtcpPortError && !customPortError && networkForm.mbtcp_port === networkForm.custom_port) {
        mbtcpPortError = t('settings.error.port.duplicate');
        customPortError = t('settings.error.port.duplicate');
      }

      setErrors({ ...errors, ip: ipError, mbtcp_port: mbtcpPortError, custom_port: customPortError });
    }
  }, [t, editNetwork, networkForm.ip, networkForm.mbtcp_port, networkForm.custom_port]);

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
    // 检查时区值是否有效
    let value = systemForm.timezone;
    let error = '';

    // 检查输入是否为有效整数
    if (isNaN(value) || !Number.isInteger(value)) {
      error = t('settings.error.timezone.invalid');
    }
    // 检查范围
    else if (value < -12) {
      error = t('settings.error.timezone.min');
    } else if (value > 12) {
      error = t('settings.error.timezone.max');
    } else {
      error = '';
    }

    if (error) {
      setErrors({ ...errors, timezone: error });
      showToast(error, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await updateSystemSettings(systemForm);
      if (res.ack) {
        setEditSystem(false);
        await loadSettings();
        showToast(t('common.success'), 'success');
      } else {
        showToast(res.error?.message || t('common.error'), 'error');
      }
    } catch (err) {
      showToast(t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const res = await updateVersionSettings(versionForm);
      if (res.ack) {
        setEditVersion(false);
        await loadSettings();
        showToast(t('common.success'), 'success');
      } else {
        showToast(res.error?.message || t('common.error'), 'error');
      }
    } catch (err) {
      showToast(t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNetwork = async () => {
    // 验证IP地址格式
    let ipError = '';
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(networkForm.ip)) {
      ipError = t('settings.error.ip.format');
    }
    
    // 验证端口
    let mbtcpPortError = '';
    let customPortError = '';
    
    // 验证Modbus TCP端口
    if (isNaN(networkForm.mbtcp_port) || !Number.isInteger(networkForm.mbtcp_port)) {
      mbtcpPortError = t('settings.error.port.invalid');
    } else if (networkForm.mbtcp_port < 500 || networkForm.mbtcp_port > 65535) {
      mbtcpPortError = t('settings.error.port.range');
    } else {
      mbtcpPortError = '';
    }
    
    // 验证自定义端口
    if (isNaN(networkForm.custom_port) || !Number.isInteger(networkForm.custom_port)) {
      customPortError = t('settings.error.port.invalid');
    } else if (networkForm.custom_port < 500 || networkForm.custom_port > 65535) {
      customPortError = t('settings.error.port.range');
    } else {
      customPortError = '';
    }
    
    // 验证端口不重复
    if (!mbtcpPortError && !customPortError && networkForm.mbtcp_port === networkForm.custom_port) {
      mbtcpPortError = t('settings.error.port.duplicate');
      customPortError = t('settings.error.port.duplicate');
    }
    
    if (ipError || mbtcpPortError || customPortError) {
      setErrors({ ...errors, ip: ipError, mbtcp_port: mbtcpPortError, custom_port: customPortError });
      if (ipError) showToast(ipError, 'error');
      if (mbtcpPortError) showToast(mbtcpPortError, 'error');
      if (customPortError && mbtcpPortError !== customPortError) showToast(customPortError, 'error');
      return;
    }
    
    setSaving(true);
    try {
      const res = await updateNetworkSettings(networkForm);
      if (res.ack) {
        setEditNetwork(false);
        await loadSettings();
        showToast(t('common.success'), 'success');
      } else {
        showToast(res.error?.message || t('common.error'), 'error');
      }
    } catch (err) {
      showToast(t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const languageOptions = [
    { value: 0, labelKey: 'settings.language.zh' as const },
    { value: 1, labelKey: 'settings.language.en' as const },
  ];

  const unitOptions = [
    { value: 0, label: 'Nm' },
    { value: 1, label: 'kgf·cm' },
    { value: 2, label: 'ft·lbf' },
    { value: 3, label: 'in·lbf' },
    { value: 4, label: 'kgf·m' },
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
              <label class={labelClass}>{t('settings.system.startMode')}</label>
              <select
                value={systemForm.start_mode}
                onChange={(e) => setSystemForm({ ...systemForm, start_mode: Number((e.target as HTMLSelectElement).value) })}
                class={selectClass}
              >
                {startModeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{getOptionLabel(o)}</option>
                ))}
              </select>
            </div>
            <div>
              <label class={labelClass}>{t('settings.system.activationMode')}</label>
              <select
                value={systemForm.activation_mode}
                onChange={(e) => setSystemForm({ ...systemForm, activation_mode: Number((e.target as HTMLSelectElement).value) })}
                class={selectClass}
              >
                {activationModeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{getOptionLabel(o)}</option>
                ))}
              </select>
            </div>
            <div>
              <label class={labelClass}>{t('settings.system.timezone')}</label>
              <input
                type="number"
                value={isNaN(systemForm.timezone) ? '' : systemForm.timezone}
                onChange={(e) => {
                  let value = (e.target as HTMLInputElement).value;
                  let numValue = parseInt(value, 10);
                  let error = '';

                  // 检查输入是否为空
                  if (value === '') {
                    // 设置错误，同时更新表单值为NaN，这样输入框会显示为空
                    setSystemForm({ ...systemForm, timezone: NaN });
                    error = t('settings.error.timezone.required');
                    setErrors({ ...errors, timezone: error });
                    return;
                  }

                  // 检查输入是否为有效整数
                  if (isNaN(numValue)) {
                    // 保持当前值，设置错误
                    error = t('settings.error.timezone.invalid');
                    setErrors({ ...errors, timezone: error });
                    return;
                  }

                  // 检查范围
                  if (numValue < -12) {
                    error = t('settings.error.timezone.min');
                  } else if (numValue > 12) {
                    error = t('settings.error.timezone.max');
                  } else {
                    error = '';
                  }

                  setSystemForm({ ...systemForm, timezone: numValue });
                  setErrors({ ...errors, timezone: error });
                }}
                class={`${inputClass} ${errors.timezone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.timezone && (
                <p class="mt-1 text-xs text-red-500">{errors.timezone}</p>
              )}
            </div>
            <div class="flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSaveSystem} loading={saving} icon="💾">{t('common.save')}</Button>
              <Button variant="secondary" onClick={() => {
                setEditSystem(false);
                if (settings?.system) {
                  setSystemForm(settings.system);
                }
                setErrors({});
              }} icon="❌">{t('common.cancel')}</Button>
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
              <Button variant="secondary" onClick={() => {
                setEditVersion(false);
                if (settings?.ver) {
                  setVersionForm({
                    name: settings.ver.name,
                    hardware: settings.ver.hardware,
                    serial: settings.ver.serial,
                  });
                }
              }} icon="❌">{t('common.cancel')}</Button>
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
                onChange={(e) => {
                  let value = (e.target as HTMLInputElement).value;
                  let error = '';
                  
                  // 检查IP地址格式
                  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\.|$)){1,4}$/;
                  if (value === '') {
                    error = t('settings.error.ip.required');
                  } else if (!ipRegex.test(value)) {
                    error = t('settings.error.ip.format');
                  } else {
                    error = '';
                  }
                  
                  setNetworkForm({ ...networkForm, ip: value });
                  setErrors({ ...errors, ip: error });
                }}
                class={`${inputClass} ${errors.ip ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.ip && (
                <p class="mt-1 text-xs text-red-500">{errors.ip}</p>
              )}
            </div>
            <div>
              <label class={labelClass}>{t('settings.network.mbtcpPort')}</label>
              <input
                type="number"
                value={isNaN(networkForm.mbtcp_port) ? '' : networkForm.mbtcp_port}
                onChange={(e) => {
                  let value = (e.target as HTMLInputElement).value;
                  let numValue = parseInt(value, 10);
                  let error = '';
                  
                  // 检查输入是否为空
                  if (value === '') {
                    // 设置错误，同时更新表单值为NaN，这样输入框会显示为空
                    setNetworkForm({ ...networkForm, mbtcp_port: NaN });
                    error = t('settings.error.port.required');
                    setErrors({ ...errors, mbtcp_port: error });
                    return;
                  }
                  
                  // 检查输入是否为有效整数
                  if (isNaN(numValue)) {
                    // 保持当前值，设置错误
                    error = t('settings.error.port.invalid');
                    setErrors({ ...errors, mbtcp_port: error });
                    return;
                  }
                  
                  // 检查端口范围
                  if (numValue < 500 || numValue > 65535) {
                    error = t('settings.error.port.range');
                  } else {
                    error = '';
                  }
                  
                  setNetworkForm({ ...networkForm, mbtcp_port: numValue });
                  setErrors({ ...errors, mbtcp_port: error });
                }}
                class={`${inputClass} ${errors.mbtcp_port ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.mbtcp_port && (
                <p class="mt-1 text-xs text-red-500">{errors.mbtcp_port}</p>
              )}
            </div>
            <div>
              <label class={labelClass}>{t('settings.network.customPort')}</label>
              <input
                type="number"
                value={isNaN(networkForm.custom_port) ? '' : networkForm.custom_port}
                onChange={(e) => {
                  let value = (e.target as HTMLInputElement).value;
                  let numValue = parseInt(value, 10);
                  let error = '';
                  
                  // 检查输入是否为空
                  if (value === '') {
                    // 设置错误，同时更新表单值为NaN，这样输入框会显示为空
                    setNetworkForm({ ...networkForm, custom_port: NaN });
                    error = t('settings.error.port.required');
                    setErrors({ ...errors, custom_port: error });
                    return;
                  }
                  
                  // 检查输入是否为有效整数
                  if (isNaN(numValue)) {
                    // 保持当前值，设置错误
                    error = t('settings.error.port.invalid');
                    setErrors({ ...errors, custom_port: error });
                    return;
                  }
                  
                  // 检查端口范围
                  if (numValue < 500 || numValue > 65535) {
                    error = t('settings.error.port.range');
                  } else {
                    error = '';
                  }
                  
                  setNetworkForm({ ...networkForm, custom_port: numValue });
                  setErrors({ ...errors, custom_port: error });
                }}
                class={`${inputClass} ${errors.custom_port ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.custom_port && (
                <p class="mt-1 text-xs text-red-500">{errors.custom_port}</p>
              )}
            </div>
            <div class="md:col-span-3 flex gap-3 pt-4 border-t border-gray-100">
              <Button onClick={handleSaveNetwork} loading={saving} icon="💾">{t('common.save')}</Button>
              <Button variant="secondary" onClick={() => {
                setEditNetwork(false);
                if (settings?.network) {
                  setNetworkForm(settings.network);
                }
              }} icon="❌">{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

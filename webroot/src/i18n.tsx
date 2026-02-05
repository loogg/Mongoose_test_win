import { createContext } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

type Language = 'zh' | 'en';

const translations = {
  zh: {
    // Common
    'common.loading': '加载中...',
    'common.save': '保存',
    'common.modify': '修改',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.refresh': '刷新',
    'common.download': '下载',
    'common.upload': '上传',
    'common.success': '成功',
    'common.error': '错误',
    'common.logout': '退出登录',

    // Navigation
    'nav.dashboard': '仪表盘',
    'nav.settings': '设置',
    'nav.firmware': '固件升级',
    'nav.debug': '调试',
    'nav.log': '日志',

    // Login
    'login.title': '控制台',
    'login.subtitle': '示教器控制台',
    'login.username': '用户名',
    'login.password': '密码',
    'login.usernamePlaceholder': '请输入用户名',
    'login.passwordPlaceholder': '请输入密码',
    'login.submit': '登录',
    'login.error': '用户名或密码错误',
    'login.required': '请输入用户名和密码',

    // Dashboard
    'dashboard.device': '设备信息',
    'dashboard.device.name': '设备名称',
    'dashboard.device.firmware': '固件版本',
    'dashboard.device.hardware': '硬件版本',
    'dashboard.device.serial': '序列号',
    'dashboard.network': '网络信息',
    'dashboard.network.ip': 'IP 地址',
    'dashboard.network.mac': 'MAC 地址',
    'dashboard.tool': '工具状态',
    'dashboard.tool.offline': '离线',
    'dashboard.tool.connecting': '连接中',
    'dashboard.tool.online': '在线',
    'dashboard.memory': '内存使用',
    'dashboard.memory.sram': 'SRAM',
    'dashboard.memory.sdram': 'SDRAM',
    'dashboard.memory.used': '已使用',
    'dashboard.memory.max_used': '最大使用',
    'dashboard.memory.usage': '使用率',
    'dashboard.memory.usage_curve': '使用曲线',
    'dashboard.memory.no_data': '暂无数据',
    'dashboard.time': '系统时间',
    'dashboard.syncTime': '同步时间',

    // Settings
    'settings.system': '系统设置',
    'settings.system.language': '语言',
    'settings.system.unit': '单位',
    'settings.system.startMode': '启动模式',
    'settings.system.activationMode': '激活模式',
    'settings.system.barcodeMode': '条码模式',
    'settings.system.timezone': '时区',
    'settings.version': '版本信息',
    'settings.network': '网络设置',
    'settings.network.mbtcpPort': 'Modbus TCP 端口',
    'settings.network.customPort': '自定义端口',

    // Firmware
    'firmware.title': '固件升级',
    'firmware.selectFile': '选择固件文件',
    'firmware.target': '升级目标',
    'firmware.target.pendant': '示教器',
    'firmware.uploading': '上传中...',
    'firmware.progress': '进度',

    // Debug
    'debug.tcpConnections': 'TCP 连接',
    'debug.tcpConnections.custom': '自定义客户端',
    'debug.tcpConnections.mbtcp': 'Modbus TCP',
    'debug.udpTarget': 'UDP 目标 IP',
    'debug.cli': '命令行',
    'debug.cli.serialLog': '串口日志使能',
    'debug.cli.telnetAuth': 'Telnet 鉴权使能',
    'debug.udpForward': 'UDP 转发',
    'debug.opLog': '操作日志',
    'debug.connected': '已连接',
    'debug.disconnected': '未连接',
    'debug.udpForward.toolRx': '工具串口接收 (5002)',
    'debug.udpForward.toolTx': '工具串口发送 (5003)',
    'debug.udpForward.screenRx': '屏幕串口接收 (5004)',
    'debug.udpForward.screenTx': '屏幕串口发送 (5005)',
    'debug.udpForward.op1Rx': 'OP1 接收 (5006)',
    'debug.udpForward.op1Tx': 'OP1 发送 (5007)',
    'debug.udpForward.op2Rx': 'OP2 接收 (5008)',
    'debug.udpForward.op2Tx': 'OP2 发送 (5009)',
    'debug.udpForward.mbtcp1Rx': 'MBTCP1 接收 (5010)',
    'debug.udpForward.mbtcp1Tx': 'MBTCP1 发送 (5011)',
    'debug.udpForward.mbtcp2Rx': 'MBTCP2 接收 (5012)',
    'debug.udpForward.mbtcp2Tx': 'MBTCP2 发送 (5013)',
    'debug.udpForward.mbtcp3Rx': 'MBTCP3 接收 (5014)',
    'debug.udpForward.mbtcp3Tx': 'MBTCP3 发送 (5015)',
    'debug.udpForward.udpLog': 'UDP 日志 (5016)',
    'debug.opLog.io': 'IO 模块操作日志',
    'debug.opLog.mbtcp': 'MBTCP 操作日志',
    'debug.opLog.op': 'OP 操作日志',
    'debug.opLog.tool': '工具操作日志',
    'debug.opLog.screen': '屏幕操作日志',

    // Log
    'log.title': '日志列表',
    'log.name': '日志名称',
    'log.size': '大小',
    'log.type': '类型',
    'log.type.file': '文件',
    'log.type.memory': '内存',
    'log.totalSize': '总大小',

    // Firmware
    'firmware.dropHint': '点击选择或拖放文件到此处',
    'firmware.uploadingHint': '正在上传固件，请勿关闭页面...',
    'firmware.success': '固件上传成功！',
    'firmware.written': '固件已写入，需要重启后生效',
    'firmware.reboot': '重启设备',
    'firmware.rebooting': '设备正在重启，请稍等...',
    'firmware.reconnecting': '正在尝试重新连接设备...',
    'firmware.reconnected': '设备已重新连接，是否刷新页面？',
    'firmware.reconnectFailed': '无法连接到设备，请手动刷新页面',
    'firmware.currentVersion': '当前版本',

    // Settings
    'settings.activationMode.barcode': '条码',
    'settings.activationMode.screen': '屏幕',
    'settings.language.zh': '中文',
    'settings.language.en': 'English',

    // Settings errors
    'settings.error.timezone.min': '时区不能小于 -12',
    'settings.error.timezone.max': '时区不能大于 +12',
    'settings.error.timezone.invalid': '时区必须是整数',
    'settings.error.timezone.required': '时区不能为空',
    'settings.error.port.range': '端口必须在 500-65535 之间',
    'settings.error.port.invalid': '端口必须是整数',
    'settings.error.port.required': '端口不能为空',
    'settings.error.port.duplicate': '端口不能重复',
    'settings.error.ip.format': 'IP 地址格式错误',
    'settings.error.ip.required': 'IP 地址不能为空',

    // Error codes
    'error.1001': '参数校验失败',
    'error.1002': '资源冲突',
    'error.2000': '固件擦除失败',
    'error.2001': '固件写入失败',
    'error.unknown': '未知错误',
    'error.networkError': '网络连接失败',

    // Common
    'common.edit': '编辑',
  },
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.modify': 'Modify',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.refresh': 'Refresh',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.logout': 'Logout',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.firmware': 'Firmware',
    'nav.debug': 'Debug',
    'nav.log': 'Log',

    // Login
    'login.title': 'Console',
    'login.subtitle': 'Teaching Pendant Console',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.usernamePlaceholder': 'Enter username',
    'login.passwordPlaceholder': 'Enter password',
    'login.submit': 'Login',
    'login.error': 'Invalid username or password',
    'login.required': 'Please enter username and password',

    // Dashboard
    'dashboard.device': 'Device Info',
    'dashboard.device.name': 'Device Name',
    'dashboard.device.firmware': 'Firmware',
    'dashboard.device.hardware': 'Hardware',
    'dashboard.device.serial': 'Serial',
    'dashboard.network': 'Network Info',
    'dashboard.network.ip': 'IP Address',
    'dashboard.network.mac': 'MAC Address',
    'dashboard.tool': 'Tool Status',
    'dashboard.tool.offline': 'Offline',
    'dashboard.tool.connecting': 'Connecting',
    'dashboard.tool.online': 'Online',
    'dashboard.memory': 'Memory Usage',
    'dashboard.memory.sram': 'SRAM',
    'dashboard.memory.sdram': 'SDRAM',
    'dashboard.memory.used': 'Used',
    'dashboard.memory.max_used': 'Max Used',
    'dashboard.memory.usage': 'Usage',
    'dashboard.memory.usage_curve': 'Usage Curve',
    'dashboard.memory.no_data': 'No Data',
    'dashboard.time': 'System Time',
    'dashboard.syncTime': 'Sync Time',

    // Settings
    'settings.system': 'System Settings',
    'settings.system.language': 'Language',
    'settings.system.unit': 'Unit',
    'settings.system.startMode': 'Start Mode',
    'settings.system.activationMode': 'Activation Mode',
    'settings.system.barcodeMode': 'Barcode Mode',
    'settings.system.timezone': 'Timezone',
    'settings.version': 'Version Info',
    'settings.network': 'Network Settings',
    'settings.network.mbtcpPort': 'Modbus TCP Port',
    'settings.network.customPort': 'Custom Port',

    // Firmware
    'firmware.title': 'Firmware Upgrade',
    'firmware.selectFile': 'Select Firmware File',
    'firmware.target': 'Target',
    'firmware.target.pendant': 'Pendant',
    'firmware.uploading': 'Uploading...',
    'firmware.progress': 'Progress',

    // Debug
    'debug.tcpConnections': 'TCP Connections',
    'debug.tcpConnections.custom': 'Custom Client',
    'debug.tcpConnections.mbtcp': 'Modbus TCP',
    'debug.udpTarget': 'UDP Target IP',
    'debug.cli': 'CLI',
    'debug.cli.serialLog': 'Serial Log Enable',
    'debug.cli.telnetAuth': 'Telnet Auth Enable',
    'debug.udpForward': 'UDP Forward',
    'debug.opLog': 'Operation Log',
    'debug.connected': 'Connected',
    'debug.disconnected': 'Disconnected',
    'debug.udpForward.toolRx': 'Tool UART RX (5002)',
    'debug.udpForward.toolTx': 'Tool UART TX (5003)',
    'debug.udpForward.screenRx': 'Screen UART RX (5004)',
    'debug.udpForward.screenTx': 'Screen UART TX (5005)',
    'debug.udpForward.op1Rx': 'OP1 RX (5006)',
    'debug.udpForward.op1Tx': 'OP1 TX (5007)',
    'debug.udpForward.op2Rx': 'OP2 RX (5008)',
    'debug.udpForward.op2Tx': 'OP2 TX (5009)',
    'debug.udpForward.mbtcp1Rx': 'MBTCP1 RX (5010)',
    'debug.udpForward.mbtcp1Tx': 'MBTCP1 TX (5011)',
    'debug.udpForward.mbtcp2Rx': 'MBTCP2 RX (5012)',
    'debug.udpForward.mbtcp2Tx': 'MBTCP2 TX (5013)',
    'debug.udpForward.mbtcp3Rx': 'MBTCP3 RX (5014)',
    'debug.udpForward.mbtcp3Tx': 'MBTCP3 TX (5015)',
    'debug.udpForward.udpLog': 'UDP Log (5016)',
    'debug.opLog.io': 'IO Module Log',
    'debug.opLog.mbtcp': 'MBTCP Log',
    'debug.opLog.op': 'OP Log',
    'debug.opLog.tool': 'Tool Log',
    'debug.opLog.screen': 'Screen Log',

    // Log
    'log.title': 'Log List',
    'log.name': 'Log Name',
    'log.size': 'Size',
    'log.type': 'Type',
    'log.type.file': 'File',
    'log.type.memory': 'Memory',
    'log.totalSize': 'Total Size',

    // Firmware
    'firmware.dropHint': 'Click to select or drag & drop file here',
    'firmware.uploadingHint': 'Uploading firmware, please do not close the page...',
    'firmware.success': 'Firmware uploaded successfully!',
    'firmware.written': 'Firmware has been written, restart required to take effect',
    'firmware.reboot': 'Restart Device',
    'firmware.rebooting': 'Device is restarting, please wait...',
    'firmware.reconnecting': 'Trying to reconnect to device...',
    'firmware.reconnected': 'Device reconnected. Refresh the page?',
    'firmware.reconnectFailed': 'Unable to connect to device, please refresh manually',
    'firmware.currentVersion': 'Current Version',

    // Settings
    'settings.activationMode.barcode': 'Barcode',
    'settings.activationMode.screen': 'Screen',
    'settings.language.zh': '中文',
    'settings.language.en': 'English',

    // Settings errors
    'settings.error.timezone.min': 'Timezone cannot be less than -12',
    'settings.error.timezone.max': 'Timezone cannot be greater than +12',
    'settings.error.timezone.invalid': 'Timezone must be an integer',
    'settings.error.timezone.required': 'Timezone cannot be empty',
    'settings.error.port.range': 'Port must be between 500-65535',
    'settings.error.port.invalid': 'Port must be an integer',
    'settings.error.port.required': 'Port cannot be empty',
    'settings.error.port.duplicate': 'Ports cannot be the same',
    'settings.error.ip.format': 'Invalid IP address format',
    'settings.error.ip.required': 'IP address cannot be empty',

    // Error codes
    'error.1001': 'Invalid parameter',
    'error.1002': 'Resource conflict',
    'error.2000': 'Firmware erase failed',
    'error.2001': 'Firmware write failed',
    'error.unknown': 'Unknown error',
    'error.networkError': 'Network connection failed',

    // Common
    'common.edit': 'Edit',
  },
} as const;

type TranslationKey = keyof typeof translations.zh;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  getErrorMessage: (code: number | undefined, fallbackMessage?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ComponentChildren }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' ? 'en' : 'zh') as Language;
  });

  const handleSetLang = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('language', newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[lang][key] || key;
    },
    [lang]
  );

  const getErrorMessage = useCallback(
    (code: number | undefined, fallbackMessage?: string): string => {
      if (code === undefined) {
        return fallbackMessage || translations[lang]['error.unknown'];
      }
      const key = `error.${code}` as TranslationKey;
      const localizedMsg = translations[lang][key];
      if (localizedMsg) {
        return localizedMsg;
      }
      // No translation found, log warning and use fallback
      console.warn(`Missing i18n key: ${key}, fallback: ${fallbackMessage}`);
      return fallbackMessage || translations[lang]['error.unknown'];
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t, getErrorMessage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

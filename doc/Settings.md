# Settings

## 基本信息

| 属性 | 值 |
|------|-----|
| 最低权限 | READONLY |

## 功能描述

设置模块提供示教器的系统配置、版本参数、网络设置的查看和修改功能：

| 区块 | 内容 | 权限 | 说明 |
|------|------|------|------|
| 系统设置 | 语言<br />单位<br />启动方式<br />激活方式<br />条码功能<br />时区<br />同步时间 | ADMIN | 同步时间是按钮，点击后下发 UTC 时间戳；其他都是下拉框，具体数值和含义见下方枚举值对照表 |
| 版本参数 | 固件版本<br />名称<br />硬件版本号<br />序列号 | ADMIN 修改<br />READONLY 查看 | 固件版本只读；其他字段 ADMIN 可修改，USER/READONLY 只读 |
| 网络设置 | IP 地址<br />Modbus TCP 端口号<br />自定义端口号 | ADMIN | IP 地址合法性前端校验；端口号最小值 500；IP 变更后前端提示使用新地址重新连接 |

### 系统设置枚举值

| 配置项 | 枚举值 | 说明 |
| -------- | ---------------------------------------------------------- | ---- |
| 屏幕语言 | 0：中文<br />1：英文 | 控制示教器界面语言 |
| 单位设置 | 0：Nm<br />1：kgf.cm<br />2：ft lbf<br />3：in lbf<br />4：kgf.m | 扭矩单位显示 |
| 启动方式 | 2：IO 启动<br />7：Modbus TCP 协议<br />8：OP 启动 | 设备启动触发方式 |
| 激活方式 | 2：Modbus-TCP 协议<br />3：IO<br />4：条码<br />5：屏幕 | 工具激活触发方式 |
| 条码功能 | 0：切换<br />1：绑定 | 条码扫描行为模式 |
| 时区 | -12 ~ +12 | 整数，对应 UTC±N 小时 |

### 无效枚举值处理

当后端返回的值不在前端定义的有效枚举范围内时：

1. **显示**：下拉框显示"未知(原始值)"，如"未知(0)"
2. **保存**：
   - 用户选择有效值后保存，新值覆盖原无效值
   - 用户未修改直接保存，该字段不提交，保持后端原值

## API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/settings | READONLY | 获取所有设置项 |
| POST | /api/settings/system | ADMIN | 修改系统设置 |
| POST | /api/settings/ver | ADMIN | 修改版本参数（除固件版本） |
| POST | /api/settings/network | ADMIN | 修改网络设置 |
| POST | /api/settings/sync-time | ADMIN | 同步系统时间 |

### GET /api/settings 响应
```json
{
  "ack": true,
  "data": {
    "system": {
      "language": 0,
      "unit": 0,
      "start_mode": 2,
      "activation_mode": 3,
      "barcode_mode": 0,
      "timezone": 8
    },
    "ver": {
      "firmware": "1.0.0",
      "name": "示教器-01",
      "hardware": "2.0",
      "serial": "SN123456"
    },
    "network": {
      "ip": "192.168.1.100",
      "mbtcp_port": 502,
      "custom_port": 8080
    }
  }
}
```

### POST /api/settings/system 请求
```json
{
  "language": 1,
  "unit": 2,
  "start_mode": 7,
  "activation_mode": 5,
  "barcode_mode": 1,
  "timezone": -5
}
```

### POST /api/settings/system 响应
```json
{
  "ack": true
}
```

### POST /api/settings/ver 请求
```json
{
  "name": "示教器-02",
  "hardware": "2.1",
  "serial": "SN789012"
}
```

### POST /api/settings/ver 响应
```json
{
  "ack": true
}
```

### POST /api/settings/network 请求
```json
{
  "ip": "192.168.1.200",
  "mbtcp_port": 502,
  "custom_port": 9090
}
```

### POST /api/settings/network 响应
```json
{
  "ack": true
}
```

### 网络设置前端处理流程

**提交前**：
1. 前端检测 IP 是否变化
2. IP 变化：弹出二次确认框，显示新旧 IP 对比，用户确认后提交
3. IP 未变化：直接提交

**提交后**：
1. IP 变化时：显示"设置已保存，请使用新地址访问"，附带 `http://新IP/` 链接
2. IP 未变化：显示"设置已保存"

**超时处理**：
- 如果后端无响应（可能 IP 已生效导致连接断开），显示倒计时后自动跳转新地址

### POST /api/settings/sync-time 请求
```json
{
  "timestamp": 1738368000
}
```

### POST /api/settings/sync-time 响应
```json
{
  "ack": true
}
```

## WebSocket 推送

Settings 模块无实时推送需求。
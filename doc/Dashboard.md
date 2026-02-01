# Dashboard

## 基本信息

| 属性 | 值 |
|------|-----|
| 最低权限 | READONLY |

## 功能描述

Dashboard 是登录后的首页，展示设备概览信息：

| 区块 | 内容 | 说明 |
|------|------|------|
| 示教器 | 固件版本、硬件版本、名称、序列号 | 静态，切换到这个模块时加载获取 |
| 工具 | 状态(离线/连接中/在线)、名称、固件版本、硬件版本、型号、序列号 | 状态和 change 标志周期性推送；change 置位时前端调用 API 获取详情；名称存储在示教器 |
| 运行状态 | 内存：SRAM、SDRAM（已使用百分比、最大使用百分比） | 动态，WebSocket 推送 |
| 网络状态 | IP 地址、MAC 地址 | 静态 |
| 系统时间 | 当前时间 | 动态，WebSocket 推送 UTC 时间戳 + 时区偏移，前端转换为设备本地时间显示 |

## API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/dashboard | READONLY | 获取静态信息（示教器、网络） |
| GET | /api/tool | READONLY | 获取当前激活工具的详细信息 |

### GET /api/dashboard 响应
```json
{
  "ack": true,
  "data": {
    "device": {
      "name": "示教器-01",
      "firmware": "1.0.0",
      "hardware": "2.0",
      "serial": "SN123456"
    },
    "network": {
      "ip": "192.168.1.100",
      "mac": "AA:BB:CC:DD:EE:FF"
    }
  }
}
```

### GET /api/tool 响应

**在线时**：
```json
{
  "ack": true,
  "data": {
    "state": 2,
    "name": "工具-01",
    "firmware": "1.2.0",
    "hardware": "1.0",
    "model": "TYPE-A",
    "serial": "TL123456"
  }
}
```

**离线时**（无激活工具）：
```json
{
  "ack": true,
  "data": {
    "state": 0
  }
}
```

## WebSocket 推送

| type | 触发时机 | 数据字段 |
|------|----------|----------|
| status | 每 3 秒 | tool_state, tool_change, sram_used, sram_max, sdram_used, sdram_max, time, tz_offset |

**字段说明**：
| 字段 | 类型 | 说明 |
|------|------|------|
| tool_state | int | 工具状态：0=离线, 1=连接中, 2=在线 |
| tool_change | bool | 激活工具发生变化，前端需调用 `/api/tool` 获取新工具信息；后端应答后自动清除 |
| sram_used | int | SRAM 已使用百分比 |
| sram_max | int | SRAM 最大使用百分比 |
| sdram_used | int | SDRAM 已使用百分比 |
| sdram_max | int | SDRAM 最大使用百分比 |
| time | int | UTC 时间戳（秒） |
| tz_offset | int | 时区偏移（小时），如 +8 表示 UTC+8 |
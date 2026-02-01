# Debug

## 基本信息

| 属性 | 值 |
|------|-----|
| 最低权限 | ADMIN |

## 功能描述

调试功能模块用于设备调试和问题排查：

| 区块 | 内容 | 说明 |
| -------- | --------------------------------------------------- | ------------------------------------------------------------ |
| TCP 连接 | 2 路自定义客户端<br />3 路 Modbus TCP 客户端 | 显示连接状态、客户端 IP 地址和端口号 |
| 调试配置 | UDP 目标 IP 地址<br />调试项开关 | 示教器通过 UDP 将报文转发到指定 IP 的固定端口，便于抓包分析 |
| 操作日志 | 各模块操作日志开关 | 控制内部模块的日志输出使能 |

### 临时生效 vs 持久保存

| 操作 | 说明 |
|------|------|
| 修改开关/配置 | **临时生效**，重启后丢失 |
| 点击“保存”按钮 | **持久保存**，写入存储，重启后生效 |

### TCP 连接状态

| 连接类型 | 数量 | 显示内容 |
|----------|------|----------|
| 自定义客户端 | 2 路 | 连接状态、IP:Port |
| Modbus TCP 客户端 | 3 路 | 连接状态、IP:Port |

### 调试开关

调试开关控制 UDP 报文转发和命令行功能：

#### 命令行相关

| 开关项 | 说明 |
|--------|------|
| 串口日志使能 | 控制串口日志输出 |
| Telnet 鉴权使能 | 控制 Telnet 登录是否需要鉴权 |

#### UDP 转发

启用后，对应报文会通过 UDP 转发到配置的目标 IP 地址的固定端口：

| 开关项 | 端口 | 说明 |
|--------|------|------|
| 工具串口接收 | 5002 | 示教器从工具接收的串口数据 |
| 工具串口发送 | 5003 | 示教器发送给工具的串口数据 |
| 屏幕串口接收 | 5004 | 示教器从屏幕接收的串口数据 |
| 屏幕串口发送 | 5005 | 示教器发送给屏幕的串口数据 |
| OP1 接收 | 5006 | OP1 通道接收数据 |
| OP1 发送 | 5007 | OP1 通道发送数据 |
| OP2 接收 | 5008 | OP2 通道接收数据 |
| OP2 发送 | 5009 | OP2 通道发送数据 |
| MBTCP1 接收 | 5010 | Modbus TCP 通道 1 接收数据 |
| MBTCP1 发送 | 5011 | Modbus TCP 通道 1 发送数据 |
| MBTCP2 接收 | 5012 | Modbus TCP 通道 2 接收数据 |
| MBTCP2 发送 | 5013 | Modbus TCP 通道 2 发送数据 |
| MBTCP3 接收 | 5014 | Modbus TCP 通道 3 接收数据 |
| MBTCP3 发送 | 5015 | Modbus TCP 通道 3 发送数据 |
| UDP 日志 | 5016 | 通用 UDP 日志输出 |

### 操作日志开关

| 开关项 | 说明 |
|--------|------|
| IO 模块操作日志 | IO 模块操作记录 |
| MBTCP 操作日志 | Modbus TCP 模块操作记录 |
| OP 操作日志 | OP 模块操作记录 |
| 工具操作日志 | 工具通信操作记录 |
| 屏幕操作日志 | 屏幕通信操作记录 |

## API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/debug | ADMIN | 获取调试配置和连接状态 |
| POST | /api/debug | ADMIN | 修改调试配置（临时生效） |
| POST | /api/debug/save | ADMIN | 保存调试配置到存储（持久化） |

### GET /api/debug 响应

```json
{
  "ack": true,
  "data": {
    "tcp_connections": {
      "custom": [
        { "id": 1, "connected": true, "ip": "192.168.1.50", "port": 8080 },
        { "id": 2, "connected": false, "ip": "", "port": 0 }
      ],
      "mbtcp": [
        { "id": 1, "connected": true, "ip": "192.168.1.51", "port": 502 },
        { "id": 2, "connected": true, "ip": "192.168.1.52", "port": 502 },
        { "id": 3, "connected": false, "ip": "", "port": 0 }
      ]
    },
    "udp_target_ip": "192.168.1.100",
    "cli": {
      "serial_log": true,
      "telnet_auth": true
    },
    "udp_forward": {
      "tool_rx": false,
      "tool_tx": false,
      "screen_rx": false,
      "screen_tx": false,
      "op1_rx": false,
      "op1_tx": false,
      "op2_rx": false,
      "op2_tx": false,
      "mbtcp1_rx": false,
      "mbtcp1_tx": false,
      "mbtcp2_rx": false,
      "mbtcp2_tx": false,
      "mbtcp3_rx": false,
      "mbtcp3_tx": false,
      "udp_log": false
    },
    "op_log": {
      "io": false,
      "mbtcp": false,
      "op": false,
      "tool": false,
      "screen": false
    }
  }
}
```

### POST /api/debug 请求

只需传递要修改的字段（**临时生效，重启后丢失**）：

```json
{
  "udp_target_ip": "192.168.1.200",
  "cli": {
    "serial_log": false
  },
  "udp_forward": {
    "tool_rx": true,
    "tool_tx": true
  },
  "op_log": {
    "tool": true
  }
}
```

### POST /api/debug 响应

```json
{
  "ack": true
}
```

### POST /api/debug/save 请求

将当前调试配置保存到存储（**持久化，重启后生效**）：

```json
{}
```

### POST /api/debug/save 响应

```json
{
  "ack": true
}
```

## WebSocket 推送

Debug 模块无 WebSocket 推送，前端通过轮询 `GET /api/debug` 获取最新状态（建议间隔 2 秒）。

## 前端显示说明

### UDP 转发开关显示

前端显示 UDP 转发开关时，应同时显示对应的目标端口号，便于用户使用抓包工具：

| 显示文本示例 |
|-------------|
| 工具串口接收 (5002) |
| 工具串口发送 (5003) |
| 屏幕串口接收 (5004) |
| ... |

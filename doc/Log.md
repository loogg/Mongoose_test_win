# Log

## 基本信息

| 属性 | 值 |
|------|-----|
| 最低权限 | ADMIN |

## 功能描述

日志模块用于查看和下载设备日志：

| 区块 | 内容 | 说明 |
|------|------|------|
| 日志列表 | 日志名称、大小、下载按钮 | 显示所有可下载的日志 |

### 日志类型

| 类型 | 存储位置 | 说明 |
|------|----------|------|
| 静态文件 | Flash/SD 卡 | 持久化存储的历史日志，直接下载 |
| 开机日志 | 内存（数组） | 本次开机以来的日志，通过 packed_fs 指向 |
| 近期日志 | 内存（ringbuffer） | 滚动覆盖的近期日志，API 返回内容后前端生成下载 |

## API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/log | ADMIN | 获取日志列表 |
| GET | /api/log/download | ADMIN | 下载日志内容 |

### GET /api/log 响应

```json
{
  "ack": true,
  "data": {
    "logs": [
      { "name": "system.log", "size": 102400, "type": "file" },
      { "name": "error.log", "size": 20480, "type": "file" },
      { "name": "boot.log", "size": 8192, "type": "memory" },
      { "name": "recent.log", "size": 16384, "type": "memory" }
    ]
  }
}
```

**字段说明**：
| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 日志名称 |
| size | int | 日志大小（字节） |
| type | string | `file`：静态文件，`memory`：内存日志 |

### GET /api/log/download 请求

```
GET /api/log/download?name=recent.log&offset=0&size=1024
```

| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | 日志名称 |
| offset | int | 读取起始偏移量（字节），默认 0 |
| size | int | 读取大小（字节），默认/最大 1024 |

### GET /api/log/download 响应

**静态文件**（type=file）：
- 使用 `mg_http_serve_file` 返回文件（忽略 offset/size 参数）
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="system.log"`

**内存日志**（type=memory）：
- 按 offset/size 分块返回文本内容
- Content-Type: `text/plain`

```json
{
  "ack": true,
  "data": {
    "offset": 0,
    "size": 1024,
    "content": "[2026-02-01 10:00:00] INFO: System started\n..."
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| offset | int | 当前块的起始偏移量 |
| size | int | 当前块的实际大小 |
| content | string | 日志文本内容 |

## WebSocket 推送

Log 模块无 WebSocket 推送。

## 前端处理说明

### 界面元素

- **刷新按钮**：重新调用 `GET /api/log` 获取最新日志列表
- **下载按钮**：每个日志项旁边的下载按钮

### 静态文件下载

1. 用户点击下载按钮
2. 直接请求 `GET /api/log/download?name=xxx`
3. 浏览器自动下载（通过 Content-Disposition）

### 内存日志下载

1. 点击刷新按钮，调用 `GET /api/log` 获取日志列表，记录该日志的 size
2. 用户点击下载按钮
3. 以列表中的 size 为准，循环分块请求：
   ```
   GET /api/log/download?name=xxx&offset=0&size=1024
   GET /api/log/download?name=xxx&offset=1024&size=1024
   ...
   ```
4. 每次将 content 追加到缓冲区
5. 当 `offset + size >= 列表中的size` 时，下载完成
6. 前端将完整内容生成 Blob 并触发下载

### ringbuffer 说明

对于近期日志（ringbuffer），后端按当前读写位置顺序拼接内容返回，确保日志时序正确。
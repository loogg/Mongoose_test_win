# Firmware

## 基本信息

| 属性 | 值 |
|------|-----|
| 最低权限 | ADMIN |

## 功能描述

固件升级模块支持示教器固件的分块上传和应用：

| 功能 | 说明 |
|------|------|
| 目标选择 | `target` 参数区分升级目标，目前仅支持示教器（`controller`） |
| 文件选择 | 选择本地固件文件（.bin） |
| 分块上传 | 按 offset/total 分块传输，每包写入后返回状态 |
| 进度显示 | 前端根据 offset/total 计算并显示进度条 |
| 重启提示 | 数据全部写入后，提示用户需重启生效，显示重启按钮 |

### 升级流程说明

1. 固件数据写入示教器的**外部 Flash**
2. 重启后，**Bootloader 会将固件从外部 Flash 搬运到内部 Flash**
3. 搬运过程时间较长（约 1-2 分钟），期间设备不可用
4. 搬运完成后设备自动启动，用户需刷新页面重新连接

## API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | /api/firmware/begin | ADMIN | 开始升级，擦除 Flash |
| POST | /api/firmware/upload | ADMIN | 分块上传固件 |
| POST | /api/reboot | ADMIN | 重启设备 |

### POST /api/firmware/begin 请求

```json
{
  "target": "controller",
  "name": "firmware_v1.2.0.bin",
  "size": 102400
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| target | string | 升级目标：`controller`（示教器），后续可扩展 `tool`（工具） |
| name | string | 固件文件名 |
| size | int | 固件总大小（字节） |

### POST /api/firmware/begin 响应

**成功**（擦除完成）：
```json
{
  "ack": true
}
```

**失败**：
```json
{
  "ack": false,
  "error": {
    "code": 2000,
    "message": "Flash erase failed"
  }
}
```

### POST /api/firmware/upload 请求

```
POST /api/firmware/upload?offset=0
Content-Type: application/octet-stream

<binary chunk>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| offset | int | 当前分块在文件中的偏移量（字节） |
| Body | binary | 二进制数据块 |

### POST /api/firmware/upload 响应

**写入成功**：
```json
{
  "ack": true,
  "data": {
    "offset": 0,
    "written": 4096
  }
}
```

**写入失败**：
```json
{
  "ack": false,
  "error": {
    "code": 2001,
    "message": "Flash write failed"
  }
}
```

### POST /api/reboot 请求
```json
{}
```

### POST /api/reboot 响应
```json
{
  "ack": true
}
```

响应后设备即将重启，前端应显示等待提示。

## WebSocket 推送

固件升级模块无 WebSocket 推送，进度由前端根据上传响应自行计算。

## 前端处理流程

### 上传流程

1. 用户选择固件文件
2. 调用 `POST /api/firmware/begin` 传递文件名和大小，后端执行擦除
3. 擦除成功后，前端分块读取文件，逐块发送 `POST /api/firmware/upload`
4. 每次响应成功后更新进度条：`进度 = (offset + written) / size * 100%`
5. 响应失败则中止上传，显示错误信息
6. 当 `offset + written >= size` 时，前端判定上传完成

### 完成后处理

1. 显示提示："固件已写入，需要重启后生效"
2. 显示重启按钮
3. 用户点击重启 → 调用 `POST /api/reboot`
4. 显示等待提示："设备正在重启，请等待一段时间..."
5. 前端定时尝试连接，连接成功后提示刷新页面

### 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 擦除失败 | 显示错误信息，可重试 |
| 网络中断 | 提示上传失败，需重新开始（从 begin 开始） |
| Flash 写入失败 | 显示错误码和消息，需重新开始 |
| 不支持的 target | 显示"不支持的升级目标" |

## Plan: 设备控制台应用需求文档

基于 Mongoose 开发设备控制台应用，用于示教器（Teaching Pendant）的配置和管理。

---

### 一、项目概述

| 项目 | 说明 |
|------|------|
| 产品名称 | 示教器设备控制台 |
| 目标平台 | 嵌入式设备 + Windows 模拟器 |
| 前端框架 | Preact + TypeScript + Tailwind CSS |
| 后端框架 | Mongoose C 库 |

---

### 二、功能模块

具体功能模块需求文档放置在 `doc/` 文件夹下，实现新模块时请先阅读对应文档。

---

### 三、参考实现

实现时参考 `Template/` 目录下的例子：

| 参考文件 | 参考内容 |
|----------|----------|
| `device-dashboard/net.c` | 认证流程、Cookie 处理、API 路由、OTA 分块上传 |
| `device-dashboard/main.c` | web_init 初始化、mg_mgr 使用 |
| `mongoose_wizard/mongoose/mongoose_glue.c` | Glue 层架构、业务回调模式 |

**注意**：Template 目录只读，不可修改，仅作参考。

---

### 四、构建与打包

**开发模式**：
```bash
cd webroot && npm run dev  # Vite 开发服务器
# vite.config.ts 配置 API 代理到后端
```

**生产构建**：
```bash
cd webroot && npm run build
node pack.js webroot/dist/* certs/* > webserver/net/webserver_packedfs.c
```

---

### 五、模块文档模板

具体功能模块需求文档放置在 `doc/` 文件夹下：

```markdown
# 模块名称

## 基本信息

| 属性 | 值 |
|------|-----|
| 最低权限 | USER |

## 功能描述

...

## API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/xxx | USER | 获取数据 |
| POST | /api/xxx | ADMIN | 修改数据 |

## WebSocket 推送（如有）

| type | 触发时机 | 数据说明 |
|------|----------|----------|
| status | 每5秒 | CPU、内存、Uptime |
```

---

### 六、异步处理思路（参考）

> **注意**：此章节仅作为后续真实设备对接时的参考思路，当前实现时无需处理。

真实设备场景下，某些操作（如数据库查询）是阻塞的，为不影响 Mongoose 性能，需要异步处理：

1. **请求到达** - 保存 `c->id`（连接 ID），不立即应答，抛事件到工作线程
2. **工作线程处理** - 执行耗时操作，完成后通知主循环
3. **主循环应答** - 通过 `c->id` 遍历 `mgr->conns` 找到连接，发送响应

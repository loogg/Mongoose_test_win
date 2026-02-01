# Copilot Instructions: 设备控制台应用开发规范

本文档定义了项目的开发规范，Copilot 在每次对话中都应遵循这些约定。

---

## 一、技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Preact + TypeScript |
| 样式 | Tailwind CSS |
| 构建工具 | Vite |
| 后端 | Mongoose C 库 |
| 协议 | HTTP:80 / HTTPS:443 / WebSocket |
| 认证 | Basic Auth + Cookie（固定 Token） |

---

## 二、目录结构

```
project/
├── webroot/                      # 前端项目（Vite）
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── i18n.tsx
├── webserver/
│   ├── app/
│   │   └── main.c                # 调用 web_init()
│   ├── common/
│   │   └── mongoose/             # 第三方库（不可修改）
│   └── net/
│       ├── webserver_impl.h
│       ├── webserver_impl.c
│       ├── webserver_glue.h
│       └── webserver_glue.c
├── doc/                          # 功能模块需求文档
└── Template/                     # 参考代码（不可修改）
```

---

## 三、文档阅读顺序

| 顺序 | 文档 | 目的 |
|------|------|------|
| 1 | 本规范文档 | 理解整体架构、技术栈、通用机制 |
| 2 | `doc/glossary.md` | 理解领域概念、业务背景 |
| 3 | `doc/具体模块.md` | 理解要实现的功能细节 |

**优先级**：规范文档 > doc/ 模块文档 > 参考例子。冲突时以规范文档为准。

**注意**：Template 目录只读，不可修改，仅作参考。

---

## 四、后端职责划分

### webserver_glue.h
```c
// 端口配置
#define HTTP_URL  "http://0.0.0.0:80"
#define HTTPS_URL "https://0.0.0.0:443"

// 权限常量
#define PERM_NONE     0   // 未登录
#define PERM_READONLY 1   // 只读用户
#define PERM_USER     3   // 普通用户
#define PERM_ADMIN    7   // 管理员

// 错误码
#define ERR_INVALID_PARAM    1001  // Invalid parameter
#define ERR_RESOURCE_CONFLICT 1002 // Resource conflict
#define ERR_OTA_BEGIN_FAILED 2000  // OTA begin failed (flash erase)
#define ERR_OTA_WRITE_FAILED 2001  // OTA write failed
```

### webserver_glue.c
- 调用 `mg_mgr_init()`、`mg_http_listen()`
- 实现 `web_init()` 初始化函数
- 定义固定用户表和 `authenticate()`
- 定义 API 注册表 `s_api_handlers[]`
- 实现所有 `handle_xxx()` 业务函数
- 实现 WebSocket 推送数据的业务逻辑

### webserver_impl.h
```c
// 用户结构体
struct user {
    const char *name;
    const char *pass;
    const char *token;
    int level;
};

// Handler 函数类型
typedef void (*api_handler_fn)(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u);

// API 注册表结构
struct api_handler {
    const char *pattern;     // URL 模式
    int min_level;           // 最低访问权限
    api_handler_fn handler;  // 处理函数
};

// HTTP 错误响应宏（协议层）
#define HTTP_REPLY_400(c) mg_http_reply(c, 400, "", "Bad Request\n")
#define HTTP_REPLY_401(c) mg_http_reply(c, 401, "", "Unauthorized\n")
#define HTTP_REPLY_403(c) mg_http_reply(c, 403, "", "Forbidden\n")
#define HTTP_REPLY_404(c) mg_http_reply(c, 404, "", "Not Found\n")
#define HTTP_REPLY_500(c) mg_http_reply(c, 500, "", "Internal Server Error\n")

// 业务响应函数（应用层）
void api_reply_ok(struct mg_connection *c, const char *data_json);
void api_reply_fail(struct mg_connection *c, int code, const char *message);

// WebSocket 广播
void ws_broadcast(struct mg_mgr *mgr, const char *json);
```

### webserver_impl.c
- 实现 `http_ev_handler()` 事件回调
- TLS 初始化（证书从 packed_fs 加载）
- 认证流程 + API 路由调度
- `/api/login`、`/api/logout` 处理
- 分块文件上传处理
- 实现业务响应辅助函数
- **HTTP 短连接**：应答后关闭连接
- WebSocket 升级与消息处理

---

## 五、认证流程

```c
static void http_ev_handler(struct mg_connection *c, int ev, void *ev_data) {
    if (ev == MG_EV_ACCEPT && c->fn_data != NULL) {
        // TLS 初始化
        struct mg_tls_opts opts = {0};
        opts.cert = mg_unpacked("/certs/server_cert.pem");
        opts.key = mg_unpacked("/certs/server_key.pem");
        mg_tls_init(c, &opts);
    } else if (ev == MG_EV_HTTP_MSG) {
        struct mg_http_message *hm = ev_data;
        struct user *u = authenticate(hm);  // 先认证

        // 未登录访问 /api/# 直接拒绝
        if (mg_match(hm->uri, mg_str("/api/#"), NULL) && u == NULL) {
            HTTP_REPLY_401(c);
        } else if (mg_match(hm->uri, mg_str("/api/login"), NULL)) {
            handle_login(c, u);
        } else if (mg_match(hm->uri, mg_str("/api/logout"), NULL)) {
            handle_logout(c);
        } else if (mg_match(hm->uri, mg_str("/api/#"), NULL)) {
            // 查找注册表
            struct api_handler *h = find_api_handler(hm);
            if (h == NULL) {
                HTTP_REPLY_404(c);
            } else if (u->level < h->min_level) {
                HTTP_REPLY_403(c);
            } else {
                h->handler(c, hm, u);
            }
        } else if (mg_match(hm->uri, mg_str("/ws"), NULL)) {
            // WebSocket 升级（需认证）
            if (u == NULL) {
                HTTP_REPLY_401(c);
            } else {
                mg_ws_upgrade(c, hm, NULL);
            }
        } else {
            // 静态文件服务
            struct mg_http_serve_opts opts = {0};
            opts.root_dir = "/web_root";
            opts.fs = &mg_fs_packed;
            mg_http_serve_dir(c, hm, &opts);
        }

        // HTTP 短连接：非 WebSocket 应答后关闭
        if (!c->is_websocket) {
            c->is_draining = 1;
        }
    } else if (ev == MG_EV_WS_MSG) {
        // WebSocket 消息处理
        struct mg_ws_message *wm = ev_data;
        handle_ws_message(c, wm);
    }
}
```

---

## 六、用户表与权限

```c
static struct user s_users[] = {
    {"admin", "admin123", "admin_token", PERM_ADMIN},
    {"user",  "user123",  "user_token",  PERM_USER},
    {"guest", "guest",    "guest_token", PERM_READONLY},
    {NULL, NULL, NULL, 0}
};
```

| 级别 | 常量 | 角色 | 能力 |
|------|------|------|------|
| 0 | `PERM_NONE` | 未登录 | 仅静态资源 |
| 1 | `PERM_READONLY` | 只读用户 | 查看数据 |
| 3 | `PERM_USER` | 普通用户 | 修改普通配置 |
| 7 | `PERM_ADMIN` | 管理员 | 完全访问 |

---

## 七、响应格式

### HTTP 层（协议级错误）

使用宏定义，直接返回 HTTP 状态码：

| 宏 | HTTP 状态码 | 使用场景 |
|----|-------------|----------|
| `HTTP_REPLY_400(c)` | 400 | 请求格式错误 |
| `HTTP_REPLY_401(c)` | 401 | 未登录 |
| `HTTP_REPLY_403(c)` | 403 | 权限不足 |
| `HTTP_REPLY_404(c)` | 404 | API 不存在 |
| `HTTP_REPLY_500(c)` | 500 | 服务器异常 |

### 应用层（业务级响应）

HTTP 200，用 JSON `ack` 字段表示业务结果：

```json
// 成功
{"ack": true, "data": {...}}

// 失败
{"ack": false, "error": {"code": 1001, "message": "Invalid device name"}}
```

**辅助函数**：
```c
static const char *s_json_header =
    "Content-Type: application/json\r\n"
    "Cache-Control: no-cache\r\n";

void api_reply_ok(struct mg_connection *c, const char *data_json) {
    mg_http_reply(c, 200, s_json_header, "{%m:true,%m:%s}\n",
                  MG_ESC("ack"), MG_ESC("data"), data_json);
}

void api_reply_fail(struct mg_connection *c, int code, const char *message) {
    mg_http_reply(c, 200, s_json_header,
                  "{%m:false,%m:{%m:%d,%m:%m}}\n",
                  MG_ESC("ack"), MG_ESC("error"),
                  MG_ESC("code"), code,
                  MG_ESC("message"), MG_ESC(message));
}
```

---

## 八、错误码处理（重要！）

### 后端

- 后端返回 `code`（数字）+ `message`（英文，用于调试/日志）
- 错误码定义在 `webserver_glue.h`

```c
#define ERR_INVALID_PARAM    1001  // Invalid parameter
#define ERR_RESOURCE_CONFLICT 1002 // Resource conflict
#define ERR_OTA_BEGIN_FAILED 2000  // OTA begin failed (flash erase)
#define ERR_OTA_WRITE_FAILED 2001  // OTA write failed
```

### 前端

**必须使用 `error.code` 查找 i18n 翻译**：

```typescript
// i18n.tsx 中定义错误码翻译
'error.1001': '参数校验失败',
'error.1002': '资源冲突',
'error.2000': '固件擦除失败',
'error.2001': '固件写入失败',
'error.unknown': '未知错误',

// 使用 getErrorMessage 辅助函数
const { getErrorMessage } = useI18n();

// API 调用失败时
if (!res.ack) {
  const errorMsg = getErrorMessage(res.error?.code, res.error?.message);
  setError(errorMsg);
}
```

**说明**：
- 前端根据 `code` 查找 i18n 多语言文本显示给用户
- 若 i18n 无对应翻译，打印 `console.warn` 便于排查遗漏
- 回退到 fallback message 或 "未知错误"

---

## 九、前端国际化规范

### 所有用户可见文本必须使用 i18n

```typescript
// ✅ 正确
{t('firmware.title')}
{t('common.save')}

// ❌ 错误 - 硬编码中文
<span>固件升级</span>
<button>保存</button>
```

### 下拉选项使用 labelKey

```typescript
// ✅ 正确
const options = [
  { value: 1, labelKey: 'settings.option.one' },
  { value: 2, labelKey: 'settings.option.two' },
];

// 渲染时
{options.map(opt => (
  <option value={opt.value}>{t(opt.labelKey)}</option>
))}

// ❌ 错误 - 硬编码 label
const options = [
  { value: 1, label: '选项一' },
];
```

---

## 十、前端权限控制

登录响应返回用户权限级别：
```json
{"user": "admin", "level": 7}
```

前端根据 `user.level >= 模块minLevel` 决定菜单是否显示：
```typescript
const navItems = [
  { path: '/dashboard', label: 'nav.dashboard', minLevel: PERM_READONLY },
  { path: '/settings',  label: 'nav.settings',  minLevel: PERM_USER },
  { path: '/firmware',  label: 'nav.firmware',  minLevel: PERM_ADMIN },
];

const visibleMenus = navItems.filter(item => user.level >= item.minLevel);
```

**说明**：
- 前端按 `level` 过滤菜单，权限不足的模块不渲染
- 后端 API 仍有权限校验（双重保障）

---

## 十一、WebSocket 推送

### 连接管理
```c
void ws_broadcast(struct mg_mgr *mgr, const char *json) {
    for (struct mg_connection *c = mgr->conns; c != NULL; c = c->next) {
        if (c->is_websocket) {
            mg_ws_send(c, json, strlen(json), WEBSOCKET_OP_TEXT);
        }
    }
}
```

### 消息格式
```json
{
    "type": "status",      // 消息类型
    "data": { ... }        // 业务数据
}
```

### 消息类型
| type | 用途 |
|------|------|
| `status` | 设备状态变更 |
| `data` | 实时数据更新 |
| `event` | 事件通知（告警等） |
| `progress` | 操作进度（OTA等） |

### 前端 WebSocket Hook
```typescript
function useWebSocket() {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws.current = new WebSocket(`${protocol}//${location.host}/ws`);

        ws.current.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            // 根据 msg.type 分发处理
        };

        return () => ws.current?.close();
    }, []);
}
```

---

## 十二、文件上传

采用分块方式：
```
POST /api/firmware/upload?offset=0
Content-Type: application/octet-stream

<binary chunk>
```

---

## 十三、HTTP 短连接

为节省嵌入式设备资源，HTTP 使用短连接模式：

```c
// 在 HTTP 响应完成后关闭连接
if (!c->is_websocket) {
    c->is_draining = 1;
}
```

**注意**：WebSocket 连接保持长连接。

---

## 十四、文件下载

通过 API 下载非 webroot 目录下的文件：

```c
} else if (mg_match(hm->uri, mg_str("/api/file/log/#"), NULL)) {
    char path[256];
    struct mg_str name = mg_str_n(hm->uri.buf + 14, hm->uri.len - 14);

    // 安全检查：防止路径穿越
    if (mg_strchr(name, '/') != NULL || mg_strcmp(name, mg_str("..")) == 0) {
        HTTP_REPLY_403(c);
        return;
    }

    mg_snprintf(path, sizeof(path), "/logs/%.*s", (int)name.len, name.buf);
    struct mg_http_serve_opts opts = {0};
    mg_http_serve_file(c, hm, path, &opts);
}
```

---

## 十五、模拟器模式

项目支持在 Windows 上作为模拟器运行。

```c
// 默认：模拟器模式
// 定义 WEBSERVER_USER 宏：真实设备模式

#if defined(WEBSERVER_USER)
    // 真实设备：用户自行实现数据获取和推送
#else
    // 模拟器：返回模拟数据
#endif
```

模拟器定时推送：
```c
#if !defined(WEBSERVER_USER)
static void timer_sim_status_fn(void *arg) {
    struct mg_mgr *mgr = (struct mg_mgr *)arg;
    char json[256];
    mg_snprintf(json, sizeof(json), "{\"type\":\"status\",\"data\":{...}}");
    ws_broadcast(mgr, json);
}

// web_init() 中注册定时器（仅模拟器）
mg_timer_add(mgr, 5000, MG_TIMER_REPEAT, timer_sim_status_fn, mgr);
#endif
```

---

## 十六、Context7 文档查询

实现功能时，**必须使用 Context7 查询相关库的最新文档**：

### 使用场景
- 使用 Mongoose C API 时（如 `mg_http_reply`、`mg_json_get_str` 等）
- 使用 Preact/React Hooks 时
- 使用 Tailwind CSS 类名时
- 使用其他第三方库时

### 调用方式
```
1. 先调用 resolve-library-id 获取库 ID
2. 再调用 get-library-docs 获取文档
```

### 常用库 ID
| 库 | Context7 ID |
|-----|-------------|
| Mongoose | `/cesanta/mongoose` |
| Preact | `/preactjs/preact` |
| Tailwind CSS | `/tailwindlabs/tailwindcss` |

### 示例
```
// 查询 Mongoose 的 JSON API
resolve-library-id("mongoose")
get-library-docs("/cesanta/mongoose", topic="json")
```

---

## 十七、关键设计要点

1. **HTTP 短连接** - 应答完成后 `c->is_draining = 1` 关闭连接
2. **WebSocket 广播** - 使用 `c->is_websocket` 判断
3. **Glue 层分离** - impl 处理协议，glue 处理业务
4. **所有 API 需登录** - 除静态资源外，统一鉴权
5. **错误码国际化** - 前端使用 `error.code` 查找翻译
6. **所有文本国际化** - 不允许硬编码中文/英文
7. **权限双重校验** - 前端过滤菜单 + 后端 API 校验
8. **Context7 查询** - 使用库 API 前先查询最新文档
---

## 十八、常见问题与最佳实践

### 18.1 后端条件编译顺序

**问题**：模拟器代码和真实设备代码混杂，不便于参照实现。

**规范**：统一使用 `#if !defined(WEBSERVER_USER)` 模拟器在前，真实设备在 `#else`：

```c
static void handle_xxx(struct mg_connection *c,
                       struct mg_http_message *hm,
                       struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
    // 模拟器实现（作为参考示例）
    char json[256];
    mg_snprintf(json, sizeof(json), "{\"key\":%m}", MG_ESC(value));
    api_reply_ok(c, json);
#else
    // 真实设备实现（用户参照模拟器代码填充）
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}
```

**好处**：
- 模拟器代码在前，阅读更直观
- 对接真实设备时，可直接参照上方模拟器代码
- 编译时定义 `WEBSERVER_USER` 宏即可切换模式

---

### 18.2 临时生效 vs 持久保存

**问题**：某些设置（如调试开关）只是临时生效，重启后丢失，需要区分"即时修改"和"持久保存"。

**规范**：

| 操作类型 | 按钮文字 | API | 说明 |
|---------|---------|-----|------|
| 即时修改 | 修改 | `POST /api/xxx` | 当前生效，重启丢失 |
| 持久保存 | 保存 | `POST /api/xxx/save` | 写入存储，重启后仍生效 |

**前端 i18n**：
```typescript
'common.modify': '修改',  // 临时修改
'common.save': '保存',    // 持久保存
```

**后端 API**：
```c
// 临时修改（内存）
{"/api/debug", PERM_ADMIN, handle_debug_get},  // POST 处理修改

// 持久保存（Flash/EEPROM）
{"/api/debug/save", PERM_ADMIN, handle_debug_save},
```

---

### 18.3 前端固定高度布局

**问题**：当页面内容过多时，侧边栏底部的用户信息区域被推出视口，无法看到。

**规范**：使用固定高度布局，避免内容撑开导致布局错乱：

```tsx
// ❌ 错误：使用 min-h-screen 可能导致内容撑开
<div class="min-h-screen flex">
  <aside class="flex flex-col">...</aside>
</div>

// ✅ 正确：使用 h-screen + overflow-hidden 固定视口
<div class="h-screen flex overflow-hidden">
  <aside class="w-64 h-screen flex flex-col">
    {/* Logo - 不压缩 */}
    <div class="flex-shrink-0">...</div>

    {/* 导航 - 可滚动 */}
    <nav class="flex-1 overflow-y-auto">...</nav>

    {/* 用户区 - 不压缩，始终可见 */}
    <div class="flex-shrink-0">...</div>
  </aside>

  <main class="flex-1 overflow-auto">
    {children}
  </main>
</div>
```

**关键类**：
- `h-screen` - 固定为视口高度
- `overflow-hidden` - 外层禁止滚动
- `flex-shrink-0` - 防止被压缩
- `overflow-y-auto` - 内容过多时允许滚动

---

### 18.4 错误码国际化实现

**问题**：后端返回的 error.message 是英文，直接显示给用户不友好。

**规范**：

**后端**：返回 `code`（数字）+ `message`（英文，用于调试）
```c
api_reply_fail(c, ERR_INVALID_PARAM, "Invalid device name");
// 返回: {"ack":false,"error":{"code":1001,"message":"Invalid device name"}}
```

**前端 i18n**：定义错误码翻译
```typescript
// i18n.tsx
'error.1001': '参数校验失败',
'error.1002': '资源冲突',
'error.2000': '固件擦除失败',
'error.2001': '固件写入失败',
'error.unknown': '未知错误',
```

**前端辅助函数**：
```typescript
function getErrorMessage(code?: number, fallback?: string): string {
  if (code) {
    const key = `error.${code}`;
    const translated = translations[lang][key];
    if (translated) return translated;
    console.warn(`Missing i18n for error code: ${code}`);
  }
  return fallback || t('error.unknown');
}
```

**使用**：
```typescript
if (!res.ack) {
  const errorMsg = getErrorMessage(res.error?.code, res.error?.message);
  setError(errorMsg);
}
```

---

### 18.5 API 路由注册顺序

**问题**：更具体的路由被更通用的路由拦截。

**规范**：API 注册表中，**更具体的路由必须放在前面**：

```c
// ✅ 正确：具体路由在前
{"/api/debug/save", PERM_ADMIN, handle_debug_save},
{"/api/debug", PERM_ADMIN, handle_debug_get},

// ❌ 错误：通用路由在前会拦截具体路由
{"/api/debug", PERM_ADMIN, handle_debug_get},
{"/api/debug/save", PERM_ADMIN, handle_debug_save},  // 永远不会匹配
```

---

### 18.6 下拉选项使用 labelKey

**问题**：下拉选项硬编码 label 文本，无法国际化。

**规范**：
```typescript
// ❌ 错误：硬编码 label
const options = [
  { value: 1, label: '选项一' },
];

// ✅ 正确：使用 labelKey
const options = [
  { value: 1, labelKey: 'settings.option.one' },
];

// 渲染时翻译
{options.map(opt => (
  <option value={opt.value}>{t(opt.labelKey)}</option>
))}
```
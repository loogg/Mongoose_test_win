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
│   ├── simulate/                 # 模拟器资源文件夹
│   │   └── Logs/                 # 模拟日志文件
│   └── net/
│       ├── webserver_impl.h
│       ├── webserver_impl.c
│       ├── webserver_glue.h
│       ├── webserver_glue_sim.c  # 模拟器实现（整个文件 #if !defined(WEBSERVER_USER) 包裹）
│       └── webserver_glue.c      # 真实设备实现（用户自行创建）
├── doc/                          # 功能模块需求文档
└── Template/                     # 参考代码（不可修改）
```

---

## 三、启动测试环境

当用户要求执行测试时，需要**同时启动前端和后端**，让整套系统运行起来。

### 跨平台启动脚本

项目根目录提供了跨平台启动脚本：

| 平台 | 脚本 | 用法 |
|------|------|------|
| Windows | `start.ps1` | `.\start.ps1 [-Mode dev\|prod] [-NoBrowser]` |
| Linux/macOS | `start.sh` | `./start.sh [dev\|prod] [--no-browser]` |
| Windows 快捷方式 | `start-dev.bat` / `start-prod.bat` | 双击运行 |

**脚本功能**：
- **开发模式** (`dev`)：启动后端 + Vite 开发服务器（HMR）
- **生产模式** (`prod`)：构建前端 → 打包到 C 文件 → 编译后端 → 启动服务
- 自动停止旧进程、检查依赖、监控服务状态
- 支持 `Ctrl+C` 优雅退出并清理进程

**使用示例**：
```powershell
# Windows PowerShell
.\start.ps1 -Mode dev          # 开发模式，打开浏览器
.\start.ps1 -Mode prod -NoBrowser  # 生产模式，不打开浏览器

# Linux/macOS Bash
chmod +x start.sh              # 首次添加执行权限
./start.sh dev                 # 开发模式
./start.sh prod --no-browser   # 生产模式
```

### 手动启动步骤

如需手动启动（不使用脚本）：

**1. 启动后端（模拟器）**：
```powershell
Stop-Process -Name "demo" -ErrorAction SilentlyContinue
cd D:\Learning\Mongoose\test_win\build
$env:Path = "D:\msys64\mingw64\bin;" + $env:Path
cmake --build . --target demo
cd D:\Learning\Mongoose\test_win  # 从项目根目录启动
.\build\bin\demo.exe
```

**2. 启动前端（Vite 开发服务器）**：
```powershell
cd D:\Learning\Mongoose\test_win\webroot
npm run dev  # 后台运行，默认端口 5173
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端开发服务器 | http://localhost:5173 | Vite HMR，API 代理到后端 |
| 前端（局域网） | http://192.168.x.x:5173 | 手机等设备访问（需配置 `host: true`） |
| 后端模拟器 | http://localhost:80 | Mongoose HTTP 服务 |

### 注意事项
- 两个服务都应以后台模式启动（`isBackground: true`）
- **后端必须从项目根目录启动**，以便正确解析模拟器资源路径
- 前端 Vite 配置了代理，`/api/*` 请求会转发到后端
- **Vite 需配置 `server.host: true`** 才能从外部设备访问（默认只监听 localhost）
- 停止测试时，需要同时停止两个进程

---

## 四、参考实现

实现时参考 `Template/` 目录下的例子：

| 参考文件 | 参考内容 |
|----------|----------|
| `device-dashboard/net.c` | 认证流程、Cookie 处理、API 路由、OTA 分块上传 |
| `device-dashboard/main.c` | web_init 初始化、mg_mgr 使用 |
| `mongoose_wizard/mongoose/mongoose_glue.c` | Glue 层架构、业务回调模式 |

**注意**：Template 目录只读，不可修改，仅作参考。

---

## 五、构建与打包

**开发模式**：
```bash
cd webroot && npm run dev  # Vite 开发服务器
# vite.config.ts 需配置：
# - server.host: true (允许外部访问)
# - server.proxy (API 代理到后端)
```

**生产构建**：
```bash
# 1. 构建前端
cd webroot && npm run build

# 2. 打包到 C 文件（Bash 语法，在项目根目录执行）
node pack.js webroot/dist/*:web_root/ certs/*:certs/ > webserver/net/webserver_packedfs.c

# PowerShell 需手动展开文件列表（见 start.ps1 实现）
```

**说明**：
- `pack.js` 位于项目根目录，将前端资源打包为 C 数组
- Bash 会自动递归展开通配符 `*`；PowerShell 需使用 `Get-ChildItem -Recurse`
- 启动脚本 `start.ps1`/`start.sh` 会自动执行上述步骤
- `public/` 目录下的文件会被 Vite 复制到 `dist/`，无需单独处理

**Vite 配置要点**：
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: true,  // 监听所有网卡，允许手机等外部设备访问
    proxy: {
      '/api': 'http://localhost:80',  // API 代理到后端
      '/ws': { target: 'ws://localhost:80', ws: true }
    }
  }
})
```

---

## 六、文档阅读顺序

| 顺序 | 文档 | 目的 |
|------|------|------|
| 1 | 本规范文档 | 理解整体架构、技术栈、通用机制 |
| 2 | `doc/glossary.md` | 理解领域概念、业务背景 |
| 3 | `doc/具体模块.md` | 理解要实现的功能细节 |

**优先级**：规范文档 > doc/ 模块文档 > 参考例子。冲突时以规范文档为准。

**注意**：Template 目录只读，不可修改，仅作参考。

---

## 七、后端职责划分

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

## 八、认证流程

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

## 九、用户表与权限

```c
static struct user s_users[] = {
    {"admin", "admin", "admin_token", PERM_ADMIN},
    {"user",  "user",  "user_token",  PERM_USER},
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

## 十、响应格式

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

## 十一、错误码处理（重要！）

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

## 十二、前端国际化规范

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

## 十三、前端权限控制

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

## 十四、WebSocket 推送

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

## 十五、文件上传

采用分块方式：
```
POST /api/firmware/upload?offset=0
Content-Type: application/octet-stream

<binary chunk>
```

---

## 十六、HTTP 短连接

为节省嵌入式设备资源，HTTP 使用短连接模式：

```c
// 在 HTTP 响应完成后关闭连接
if (!c->is_websocket) {
    c->is_draining = 1;
}
```

**注意**：WebSocket 连接保持长连接。

---

## 十七、文件下载

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

## 十八、模拟器模式

项目支持在 Windows 上作为模拟器运行，便于前端开发和调试。

**架构设计**：模拟器代码完全独立在 `webserver_glue_sim.c` 文件中。

| 模式 | 宏定义 | 使用文件 |
|------|--------|----------|
| 模拟器 | 未定义 `WEBSERVER_USER` | `webserver_glue_sim.c` |
| 真实设备 | 定义 `WEBSERVER_USER` | `webserver_glue.c`（用户自己创建） |

**切换方式**：在 `mongoose_config.h` 中添加或注释：
```c
// #define WEBSERVER_USER  // 取消注释则使用真实设备实现
```

**模拟器文件特点**：
- 整个文件被 `#if !defined(WEBSERVER_USER)` 包裹
- 不定义宏时正常编译，定义宏时整个文件为空
- 包含完整的模拟数据和 API 处理逻辑，可作为真实设备实现的参考

---

## 十九、Context7 文档查询

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

## 二十、关键设计要点

1. **HTTP 短连接** - 应答完成后 `c->is_draining = 1` 关闭连接
2. **WebSocket 广播** - 使用 `c->is_websocket` 判断
3. **Glue 层分离** - impl 处理协议，sim/glue 处理业务
4. **模拟器独立文件** - `webserver_glue_sim.c` 整个文件用 `#if !defined(WEBSERVER_USER)` 包裹
5. **所有 API 需登录** - 除静态资源外，统一鉴权
6. **错误码国际化** - 前端使用 `error.code` 查找翻译
7. **所有文本国际化** - 不允许硬编码中文/英文
8. **权限双重校验** - 前端过滤菜单 + 后端 API 校验
9. **Context7 查询** - 使用库 API 前先查询最新文档
---

## 二十一、常见问题与最佳实践

### 21.1 模拟器与真实设备分离

**问题**：模拟器代码和真实设备代码混杂在同一文件中，不便于参照实现。

**规范**：使用独立文件分离模拟器和真实设备代码：

| 文件 | 用途 | 条件编译 |
|------|------|----------|
| `webserver_glue_sim.c` | 模拟器实现 | 整个文件 `#if !defined(WEBSERVER_USER)` 包裹 |
| `webserver_glue.c` | 真实设备实现 | 用户参照 sim.c 自行编写 |

**模拟器文件结构**：
```c
// webserver_glue_sim.c
#include "webserver_glue.h"
#include "webserver_impl.h"

#if !defined(WEBSERVER_USER)

// 模拟数据
static const char *s_device_name = "示教器-01";
// ...

// API 处理函数
static void handle_dashboard(...) { ... }
static void handle_settings_get(...) { ... }

// API 注册表
struct api_handler s_api_handlers[] = { ... };

// 初始化
void web_init(struct mg_mgr *mgr) { ... }

#endif  // !WEBSERVER_USER
```

**对接真实设备**：
1. 在 `mongoose_config.h` 中定义 `#define WEBSERVER_USER`
2. 创建 `webserver_glue.c`，参照 `webserver_glue_sim.c` 实现
3. 模拟器文件编译后为空，不影响最终固件

---

### 21.2 临时生效 vs 持久保存

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

### 21.3 前端固定高度布局

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

### 21.4 错误码国际化实现

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

### 21.5 API 路由注册顺序

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

### 21.6 下拉选项使用 labelKey

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

---

### 21.7 状态存储 i18n key 而非翻译文本

**问题**：将翻译后的文本存入 state，切换语言后不会更新。

**典型错误场景**：
```typescript
// ❌ 错误：存储翻译后的文本
const [error, setError] = useState('');

// 设置错误时已经翻译了
if (!username) {
  setError(t('login.required'));  // 存的是 "请输入用户名" 或 "Please enter username"
}

// 渲染时直接显示，切换语言后不会变
{error && <div>{error}</div>}
```

**规范**：状态中存储翻译 key，渲染时动态翻译：
```typescript
// ✅ 正确：存储 key
const [errorKey, setErrorKey] = useState<string | null>(null);

// 设置时存 key
if (!username) {
  setErrorKey('login.required');  // 存的是 key
}

// 渲染时翻译，语言切换会自动更新
{errorKey && <div>{t(errorKey)}</div>}
```

**适用场景**：
- 表单验证错误信息
- 操作结果提示（成功/失败）
- 任何需要在 UI 中显示且可能跨语言切换的动态文本

**例外**：API 返回的 error.message（英文）可直接存储，但显示时应优先使用 `getErrorMessage(code)` 查找翻译。

---

### 21.8 应用图标与标签页配置

**问题**：使用 Vite 默认图标，不符合应用主题。

**规范**：创建应用专属图标并配置：

**1. 创建图标文件** `webroot/public/console.svg`：
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- 应用主题相关的 SVG 图标 -->
</svg>
```

**2. 配置 `webroot/index.html`**：
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/console.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>设备控制台</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**关键配置**：
| 属性 | 说明 | 示例值 |
|------|------|--------|
| `lang` | 默认语言 | `zh-CN` |
| `link[rel="icon"]` | 应用图标 | `/console.svg` |
| `title` | 标签页标题 | `设备控制台` |

**注意**：
- 图标使用 SVG 格式，支持缩放且文件小
- 图标设计应与应用主题一致（如控制台应用使用终端/控制面板图标）
- 不要使用框架默认图标（如 Vite 的闪电图标）

---

### 21.9 模拟器资源路径约定

**问题**：模拟器资源文件路径写死相对于 `build/bin/` 目录，导致 VSCode 调试时找不到文件。

**规范**：模拟器所有资源文件路径使用**相对于项目根目录**的路径：

```c
// ✅ 正确：相对于项目根目录（VSCode 调试时工作目录）
#define SIM_LOGS_DIR "webserver/simulate/Logs"

// ❌ 错误：相对于 build/bin 目录
#define SIM_LOGS_DIR "../../webserver/simulate/Logs"
```

**目录结构**：
```
project/
├── webserver/
│   └── simulate/           # 模拟器资源目录
│       └── Logs/           # 模拟日志文件
├── build/
│   └── bin/
│       └── demo.exe        # 编译产物
```

**说明**：
- VSCode 调试时，工作目录默认是项目根目录
- 命令行启动时，需在项目根目录执行 `./build/bin/demo.exe`

---

### 21.10 页面 API 数据聚合原则

**问题**：页面初始加载需要多次 API 请求，且实时数据需要等 WebSocket 推送才能显示。

**规范**：页面主 API 应返回该页面所需的**全部初始数据**，包括：
- 静态配置数据
- 关联模块数据
- WebSocket 推送数据的初始快照

**示例（Dashboard）**：

```c
// /api/dashboard 返回完整数据
{
    "device": {...},      // 设备信息
    "network": {...},     // 网络信息
    "tool": {...},        // 工具信息（原本需要单独请求 /api/tool）
    "status": {           // WebSocket 推送的初始状态
        "timestamp": 1234567890,
        "tz_offset": 8,
        "sram_used": 45,
        "sram_max": 67,
        "tool_state": 2,
        "tool_change": false
    }
}
```

**前端处理**：
```typescript
// ✅ 正确：一次请求获取全部数据
getDashboard().then(res => {
    setDashboard(res.data);
    setTool(res.data.tool);           // 从 dashboard 响应初始化
    setStatus(res.data.status);        // 初始状态，无需等 WebSocket
});

// ❌ 错误：多次请求
Promise.all([getDashboard(), getTool()]).then(...);  // 浪费请求
// 且 status 需要等 WebSocket 推送才有数据
```

**优点**：
- 减少 HTTP 请求次数
- 页面首次渲染即显示完整状态
- WebSocket 仅用于后续实时更新

---

### 21.11 启动脚本编写规范

**问题**：PowerShell 脚本包含中文时，通过 cmd/bat 调用会出现编码乱码错误。

**规范**：

**1. PowerShell 脚本使用纯英文**：
```powershell
# ✅ 正确：纯英文
Write-Host "[+] Backend started"
Write-Host "  Mode: Development"

# ❌ 错误：包含中文（cmd 调用时乱码）
Write-Host "✓ 后端已启动"
Write-Host "  模式: 开发模式"
```

**2. bat 调用 ps1 使用 -Command 方式**：
```bat
@echo off
cd /d "%~dp0"
REM ✅ 正确：使用 -Command 调用
powershell -ExecutionPolicy Bypass -Command "& '%~dp0start.ps1' -Mode dev"
pause

REM ❌ 错误：-File 方式传参可能有问题
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1" -Mode dev
```

**3. 脚本文件结构**：

| 文件 | 用途 |
|------|------|
| `start.ps1` | 主脚本（PowerShell，纯英文） |
| `start-dev.bat` | 开发模式快捷方式（双击运行） |
| `start-prod.bat` | 生产模式快捷方式（双击运行） |

**4. 脚本参数设计**：
```powershell
param(
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev",
    [switch]$NoBrowser
)
```

---

### 21.12 文件下载必须指定 filename

**问题**：使用 `Content-Disposition: attachment` 下载文件时，浏览器显示文件名为 "download" 而不是实际文件名。

**原因**：`Content-Disposition` 头只有 `attachment`，缺少 `filename` 参数。

**规范**：

```c
// ❌ 错误：缺少 filename，浏览器显示 "download"
struct mg_http_serve_opts opts = {0};
opts.extra_headers = "Content-Disposition: attachment\r\n";
mg_http_serve_file(c, hm, path, &opts);

// ✅ 正确：指定 filename，浏览器显示实际文件名
char headers[256];
mg_snprintf(headers, sizeof(headers),
            "Content-Disposition: attachment; filename=\"%s\"\r\n", filename);

struct mg_http_serve_opts opts = {0};
opts.extra_headers = headers;
mg_http_serve_file(c, hm, path, &opts);
```

**注意事项**：
- `filename` 用双引号包裹，防止特殊字符问题
- 如果文件名包含非 ASCII 字符，需使用 `filename*=UTF-8''xxx` 格式（RFC 5987）
- `headers` 缓冲区必须在 `mg_http_serve_file` 调用期间有效（不能是已释放的内存）
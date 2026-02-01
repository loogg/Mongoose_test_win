// Copyright (c) 2026
// Web Server Glue Layer - Simulator Implementation
// This file is only compiled when WEBSERVER_USER is NOT defined.
// For real device, create your own webserver_glue.c based on this file.

#include "webserver_glue.h"
#include "webserver_impl.h"

#include <string.h>
#include <time.h>

#if !defined(WEBSERVER_USER)

// -----------------------------------------------------------------------------
// Static Variables
// -----------------------------------------------------------------------------
static struct mg_mgr *s_mgr = NULL;

// -----------------------------------------------------------------------------
// User Table (Fixed tokens for embedded device)
// -----------------------------------------------------------------------------
static struct user s_users[] = {
    {"admin", "admin123", "admin_token_fixed", PERM_ADMIN},
    {"user",  "user123",  "user_token_fixed",  PERM_USER},
    {"guest", "guest",    "guest_token_fixed", PERM_READONLY},
    {NULL, NULL, NULL, 0}
};

// -----------------------------------------------------------------------------
// Simulator Data (for Windows development)
// -----------------------------------------------------------------------------

// Simulated device info
static const char *s_device_name = "示教器-01";
static const char *s_device_firmware = "1.0.0";
static const char *s_device_hardware = "2.0";
static const char *s_device_serial = "SN123456";
static const char *s_device_ip = "192.168.1.100";
static const char *s_device_mac = "AA:BB:CC:DD:EE:FF";

// Simulated tool info
static int s_tool_state = 1;  // 0=offline, 1=connecting, 2=online
static bool s_tool_change = false;
static const char *s_tool_name = "工具-01";
static const char *s_tool_firmware = "1.2.0";
static const char *s_tool_hardware = "1.0";
static const char *s_tool_model = "TYPE-A";
static const char *s_tool_serial = "TL123456";

// Simulated memory stats
static int s_sram_used = 45;
static int s_sram_max = 67;
static int s_sdram_used = 32;
static int s_sdram_max = 58;

// Timezone offset (hours from UTC)
static int s_tz_offset = 8;

// Debug module: TCP connection states
static struct {
    bool connected;
    char ip[20];
    int port;
} s_tcp_custom[2] = {
    {true, "192.168.1.50", 8080},
    {false, "", 0}
};

static struct {
    bool connected;
    char ip[20];
    int port;
} s_tcp_mbtcp[3] = {
    {true, "192.168.1.51", 502},
    {true, "192.168.1.52", 502},
    {false, "", 0}
};

// Debug module: UDP target IP
static char s_udp_target_ip[20] = "192.168.1.100";

// Debug module: CLI flags
static bool s_cli_serial_log = true;
static bool s_cli_telnet_auth = true;

// Debug module: UDP forward flags
static struct {
    bool tool_rx, tool_tx;
    bool screen_rx, screen_tx;
    bool op1_rx, op1_tx;
    bool op2_rx, op2_tx;
    bool mbtcp1_rx, mbtcp1_tx;
    bool mbtcp2_rx, mbtcp2_tx;
    bool mbtcp3_rx, mbtcp3_tx;
    bool udp_log;
} s_udp_forward = {0};

// Debug module: Operation log flags
static struct {
    bool io, mbtcp, op, tool, screen;
} s_op_log = {0};

// Log module: Memory log entries (file logs are read from simulate/Logs directory)
static struct {
    const char *name;
    int size;
    const char *type;  // "memory" only - file logs are dynamic
} s_memory_logs[] = {
    {"boot.log",    8192,   "memory"},
    {"recent.log",  16384,  "memory"},
    {NULL, 0, NULL}
};

// Simulated memory log content (for boot.log / recent.log)
static const char *s_boot_log_content =
    "[2026-02-01 10:00:00] INFO: System started\n"
    "[2026-02-01 10:00:01] INFO: Hardware initialized\n"
    "[2026-02-01 10:00:02] INFO: Network ready\n"
    "[2026-02-01 10:00:03] INFO: Web server started\n";

static const char *s_recent_log_content =
    "[2026-02-01 10:05:00] INFO: User admin logged in\n"
    "[2026-02-01 10:05:15] INFO: Settings updated\n"
    "[2026-02-01 10:05:30] DEBUG: Tool status check\n"
    "[2026-02-01 10:06:00] INFO: Dashboard accessed\n";

// Simulated settings
static int s_language = 0;        // 0=Chinese, 1=English
static int s_unit = 0;            // 0=Nm, 1=kgf.cm, etc.
static int s_start_mode = 2;      // 2=IO, 7=Modbus TCP, 8=OP
static int s_activation_mode = 3; // 2=MBTCP, 3=IO, 4=Barcode, 5=Screen
static int s_barcode_mode = 0;    // 0=Switch, 1=Bind
static int s_mbtcp_port = 502;
static int s_custom_port = 8080;

// Mutable device info (can be modified via API)
static char s_device_name_buf[64] = "示教器-01";
static char s_device_hardware_buf[32] = "2.0";
static char s_device_serial_buf[32] = "SN123456";
static char s_device_ip_buf[20] = "192.168.1.100";

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------
struct user *glue_authenticate(struct mg_http_message *hm) {
    char user[64], pass[64];
    struct user *u, *result = NULL;

    mg_http_creds(hm, user, sizeof(user), pass, sizeof(pass));
    MG_DEBUG(("Auth: user=[%s] pass=[%s]", user, pass));

    if (user[0] != '\0' && pass[0] != '\0') {
        // Basic Auth: search by user/password
        for (u = s_users; result == NULL && u->name != NULL; u++) {
            if (strcmp(user, u->name) == 0 && strcmp(pass, u->pass) == 0) {
                result = u;
            }
        }
    } else if (user[0] == '\0' && pass[0] != '\0') {
        // Cookie token: search by token
        for (u = s_users; result == NULL && u->name != NULL; u++) {
            if (strcmp(pass, u->token) == 0) {
                result = u;
            }
        }
    }

    return result;
}

struct mg_mgr *glue_get_mgr(void) {
    return s_mgr;
}

// -----------------------------------------------------------------------------
// Dashboard API Handlers
// -----------------------------------------------------------------------------
static void handle_dashboard(struct mg_connection *c,
                             struct mg_http_message *hm,
                             struct user *u) {
    (void) hm;
    (void) u;

    char json[1024];
    time_t now = time(NULL);

    // Return all dashboard data in one response:
    // - device info
    // - network info
    // - tool info (initial state)
    // - real-time status (same as WebSocket push, for initial load)
    if (s_tool_state == 0) {
        mg_snprintf(json, sizeof(json),
            "{\"device\":{\"name\":%m,\"firmware\":%m,\"hardware\":%m,\"serial\":%m},"
            "\"network\":{\"ip\":%m,\"mac\":%m},"
            "\"tool\":{\"state\":0},"
            "\"status\":{\"timestamp\":%lu,\"tz_offset\":%d,"
            "\"sram_used\":%d,\"sram_max\":%d,\"sdram_used\":%d,\"sdram_max\":%d,"
            "\"tool_state\":%d,\"tool_change\":false}}",
            MG_ESC(s_device_name), MG_ESC(s_device_firmware),
            MG_ESC(s_device_hardware), MG_ESC(s_device_serial),
            MG_ESC(s_device_ip), MG_ESC(s_device_mac),
            (unsigned long)now, s_tz_offset,
            s_sram_used, s_sram_max, s_sdram_used, s_sdram_max,
            s_tool_state);
    } else {
        mg_snprintf(json, sizeof(json),
            "{\"device\":{\"name\":%m,\"firmware\":%m,\"hardware\":%m,\"serial\":%m},"
            "\"network\":{\"ip\":%m,\"mac\":%m},"
            "\"tool\":{\"state\":%d,\"name\":%m,\"firmware\":%m,"
            "\"hardware\":%m,\"model\":%m,\"serial\":%m},"
            "\"status\":{\"timestamp\":%lu,\"tz_offset\":%d,"
            "\"sram_used\":%d,\"sram_max\":%d,\"sdram_used\":%d,\"sdram_max\":%d,"
            "\"tool_state\":%d,\"tool_change\":false}}",
            MG_ESC(s_device_name), MG_ESC(s_device_firmware),
            MG_ESC(s_device_hardware), MG_ESC(s_device_serial),
            MG_ESC(s_device_ip), MG_ESC(s_device_mac),
            s_tool_state, MG_ESC(s_tool_name), MG_ESC(s_tool_firmware),
            MG_ESC(s_tool_hardware), MG_ESC(s_tool_model), MG_ESC(s_tool_serial),
            (unsigned long)now, s_tz_offset,
            s_sram_used, s_sram_max, s_sdram_used, s_sdram_max,
            s_tool_state);
    }
    api_reply_ok(c, json);
}

static void handle_tool(struct mg_connection *c,
                        struct mg_http_message *hm,
                        struct user *u) {
    (void) hm;
    (void) u;

    char json[512];

    // Clear tool_change flag after API call
    s_tool_change = false;

    if (s_tool_state == 0) {
        // Offline: only return state
        mg_snprintf(json, sizeof(json), "{\"state\":0}");
    } else {
        // Online/Connecting: return full info
        mg_snprintf(json, sizeof(json),
            "{\"state\":%d,\"name\":%m,\"firmware\":%m,"
            "\"hardware\":%m,\"model\":%m,\"serial\":%m}",
            s_tool_state, MG_ESC(s_tool_name), MG_ESC(s_tool_firmware),
            MG_ESC(s_tool_hardware), MG_ESC(s_tool_model), MG_ESC(s_tool_serial));
    }
    api_reply_ok(c, json);
}

// -----------------------------------------------------------------------------
// Settings API Handlers
// -----------------------------------------------------------------------------
static void handle_settings_get(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u) {
    (void) hm;
    (void) u;

    char json[1024];
    mg_snprintf(json, sizeof(json),
        "{\"system\":{"
        "\"language\":%d,\"unit\":%d,\"start_mode\":%d,"
        "\"activation_mode\":%d,\"barcode_mode\":%d,\"timezone\":%d},"
        "\"ver\":{"
        "\"firmware\":%m,\"name\":%m,\"hardware\":%m,\"serial\":%m},"
        "\"network\":{"
        "\"ip\":%m,\"mbtcp_port\":%d,\"custom_port\":%d}}",
        s_language, s_unit, s_start_mode,
        s_activation_mode, s_barcode_mode, s_tz_offset,
        MG_ESC(s_device_firmware), MG_ESC(s_device_name_buf),
        MG_ESC(s_device_hardware_buf), MG_ESC(s_device_serial_buf),
        MG_ESC(s_device_ip_buf), s_mbtcp_port, s_custom_port);
    api_reply_ok(c, json);
}

static void handle_settings_system(struct mg_connection *c,
                                   struct mg_http_message *hm,
                                   struct user *u) {
    (void) u;

    // Parse JSON body and update settings
    s_language = (int) mg_json_get_long(hm->body, "$.language", s_language);
    s_unit = (int) mg_json_get_long(hm->body, "$.unit", s_unit);
    s_start_mode = (int) mg_json_get_long(hm->body, "$.start_mode", s_start_mode);
    s_activation_mode = (int) mg_json_get_long(hm->body, "$.activation_mode", s_activation_mode);
    s_barcode_mode = (int) mg_json_get_long(hm->body, "$.barcode_mode", s_barcode_mode);
    s_tz_offset = (int) mg_json_get_long(hm->body, "$.timezone", s_tz_offset);

    MG_INFO(("Settings/system updated: lang=%d unit=%d start=%d activ=%d barcode=%d tz=%d",
             s_language, s_unit, s_start_mode, s_activation_mode, s_barcode_mode, s_tz_offset));
    api_reply_ok(c, NULL);
}

static void handle_settings_ver(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u) {
    (void) u;

    char *name = mg_json_get_str(hm->body, "$.name");
    char *hardware = mg_json_get_str(hm->body, "$.hardware");
    char *serial = mg_json_get_str(hm->body, "$.serial");

    if (name) {
        mg_snprintf(s_device_name_buf, sizeof(s_device_name_buf), "%s", name);
        free(name);
    }
    if (hardware) {
        mg_snprintf(s_device_hardware_buf, sizeof(s_device_hardware_buf), "%s", hardware);
        free(hardware);
    }
    if (serial) {
        mg_snprintf(s_device_serial_buf, sizeof(s_device_serial_buf), "%s", serial);
        free(serial);
    }

    MG_INFO(("Settings/ver updated: name=%s hw=%s sn=%s",
             s_device_name_buf, s_device_hardware_buf, s_device_serial_buf));
    api_reply_ok(c, NULL);
}

static void handle_settings_network(struct mg_connection *c,
                                    struct mg_http_message *hm,
                                    struct user *u) {
    (void) u;

    char *ip = mg_json_get_str(hm->body, "$.ip");

    if (ip) {
        mg_snprintf(s_device_ip_buf, sizeof(s_device_ip_buf), "%s", ip);
        free(ip);
    }
    s_mbtcp_port = (int) mg_json_get_long(hm->body, "$.mbtcp_port", s_mbtcp_port);
    s_custom_port = (int) mg_json_get_long(hm->body, "$.custom_port", s_custom_port);

    MG_INFO(("Settings/network updated: ip=%s mbtcp=%d custom=%d",
             s_device_ip_buf, s_mbtcp_port, s_custom_port));
    api_reply_ok(c, NULL);
}

static void handle_settings_sync_time(struct mg_connection *c,
                                      struct mg_http_message *hm,
                                      struct user *u) {
    (void) u;

    long ts = mg_json_get_long(hm->body, "$.timestamp", 0);
    MG_INFO(("Sync time received: %ld (simulator - ignored)", ts));
    api_reply_ok(c, NULL);
}

// -----------------------------------------------------------------------------
// Firmware API Handlers
// -----------------------------------------------------------------------------
static char s_fw_name[64] = "";
static size_t s_fw_size = 0;
static size_t s_fw_written = 0;

static void handle_firmware_begin(struct mg_connection *c,
                                  struct mg_http_message *hm,
                                  struct user *u) {
    (void) u;

    char *target = mg_json_get_str(hm->body, "$.target");
    char *name = mg_json_get_str(hm->body, "$.name");
    long size = mg_json_get_long(hm->body, "$.size", 0);

    // Validate target
    if (target == NULL || strcmp(target, "controller") != 0) {
        if (target) free(target);
        if (name) free(name);
        api_reply_fail(c, ERR_INVALID_PARAM, "Unsupported target");
        return;
    }

    // Store firmware info
    if (name) {
        mg_snprintf(s_fw_name, sizeof(s_fw_name), "%s", name);
        free(name);
    }
    s_fw_size = (size_t) size;
    s_fw_written = 0;

    free(target);

    MG_INFO(("Firmware begin: name=%s size=%lu", s_fw_name, (unsigned long) s_fw_size));

    // Simulate flash erase
    api_reply_ok(c, NULL);
}

static void handle_firmware_upload(struct mg_connection *c,
                                   struct mg_http_message *hm,
                                   struct user *u) {
    (void) u;

    char offset_str[20];
    long offset = -1;

    mg_http_get_var(&hm->query, "offset", offset_str, sizeof(offset_str));
    offset = strtol(offset_str, NULL, 10);

    if (offset < 0) {
        api_reply_fail(c, ERR_INVALID_PARAM, "Invalid offset");
        return;
    }

    size_t len = hm->body.len;

    // Simulate flash write
    s_fw_written = (size_t) offset + len;

    MG_INFO(("Firmware upload: offset=%ld len=%lu total_written=%lu/%lu",
             offset, (unsigned long) len,
             (unsigned long) s_fw_written, (unsigned long) s_fw_size));

    char json[128];
    mg_snprintf(json, sizeof(json), "{\"offset\":%ld,\"written\":%lu}",
                offset, (unsigned long) len);
    api_reply_ok(c, json);
}

// -----------------------------------------------------------------------------
// Debug API Handlers
// -----------------------------------------------------------------------------

// Forward declaration for POST handler
static void handle_debug_set(struct mg_connection *c,
                             struct mg_http_message *hm,
                             struct user *u);

static void handle_debug_get(struct mg_connection *c,
                             struct mg_http_message *hm,
                             struct user *u) {
    // Check method: POST goes to set handler
    if (mg_match(hm->method, mg_str("POST"), NULL)) {
        handle_debug_set(c, hm, u);
        return;
    }

    (void) u;

    // Build JSON response with all debug info
    char json[2048];
    mg_snprintf(json, sizeof(json),
        "{\"tcp_connections\":{"
        "\"custom\":["
        "{\"id\":1,\"connected\":%s,\"ip\":%m,\"port\":%d},"
        "{\"id\":2,\"connected\":%s,\"ip\":%m,\"port\":%d}"
        "],"
        "\"mbtcp\":["
        "{\"id\":1,\"connected\":%s,\"ip\":%m,\"port\":%d},"
        "{\"id\":2,\"connected\":%s,\"ip\":%m,\"port\":%d},"
        "{\"id\":3,\"connected\":%s,\"ip\":%m,\"port\":%d}"
        "]},"
        "\"udp_target_ip\":%m,"
        "\"cli\":{\"serial_log\":%s,\"telnet_auth\":%s},"
        "\"udp_forward\":{"
        "\"tool_rx\":%s,\"tool_tx\":%s,"
        "\"screen_rx\":%s,\"screen_tx\":%s,"
        "\"op1_rx\":%s,\"op1_tx\":%s,"
        "\"op2_rx\":%s,\"op2_tx\":%s,"
        "\"mbtcp1_rx\":%s,\"mbtcp1_tx\":%s,"
        "\"mbtcp2_rx\":%s,\"mbtcp2_tx\":%s,"
        "\"mbtcp3_rx\":%s,\"mbtcp3_tx\":%s,"
        "\"udp_log\":%s},"
        "\"op_log\":{\"io\":%s,\"mbtcp\":%s,\"op\":%s,\"tool\":%s,\"screen\":%s}}",
        // TCP custom
        s_tcp_custom[0].connected ? "true" : "false", MG_ESC(s_tcp_custom[0].ip), s_tcp_custom[0].port,
        s_tcp_custom[1].connected ? "true" : "false", MG_ESC(s_tcp_custom[1].ip), s_tcp_custom[1].port,
        // TCP mbtcp
        s_tcp_mbtcp[0].connected ? "true" : "false", MG_ESC(s_tcp_mbtcp[0].ip), s_tcp_mbtcp[0].port,
        s_tcp_mbtcp[1].connected ? "true" : "false", MG_ESC(s_tcp_mbtcp[1].ip), s_tcp_mbtcp[1].port,
        s_tcp_mbtcp[2].connected ? "true" : "false", MG_ESC(s_tcp_mbtcp[2].ip), s_tcp_mbtcp[2].port,
        // UDP target
        MG_ESC(s_udp_target_ip),
        // CLI
        s_cli_serial_log ? "true" : "false", s_cli_telnet_auth ? "true" : "false",
        // UDP forward
        s_udp_forward.tool_rx ? "true" : "false", s_udp_forward.tool_tx ? "true" : "false",
        s_udp_forward.screen_rx ? "true" : "false", s_udp_forward.screen_tx ? "true" : "false",
        s_udp_forward.op1_rx ? "true" : "false", s_udp_forward.op1_tx ? "true" : "false",
        s_udp_forward.op2_rx ? "true" : "false", s_udp_forward.op2_tx ? "true" : "false",
        s_udp_forward.mbtcp1_rx ? "true" : "false", s_udp_forward.mbtcp1_tx ? "true" : "false",
        s_udp_forward.mbtcp2_rx ? "true" : "false", s_udp_forward.mbtcp2_tx ? "true" : "false",
        s_udp_forward.mbtcp3_rx ? "true" : "false", s_udp_forward.mbtcp3_tx ? "true" : "false",
        s_udp_forward.udp_log ? "true" : "false",
        // Op log
        s_op_log.io ? "true" : "false", s_op_log.mbtcp ? "true" : "false",
        s_op_log.op ? "true" : "false", s_op_log.tool ? "true" : "false",
        s_op_log.screen ? "true" : "false");

    api_reply_ok(c, json);
}

static void handle_debug_set(struct mg_connection *c,
                             struct mg_http_message *hm,
                             struct user *u) {
    (void) u;

    // Parse and update UDP target IP
    char *ip = mg_json_get_str(hm->body, "$.udp_target_ip");
    if (ip) {
        mg_snprintf(s_udp_target_ip, sizeof(s_udp_target_ip), "%s", ip);
        free(ip);
    }

    // Parse CLI flags
    bool found;
    bool val;

    val = mg_json_get_bool(hm->body, "$.cli.serial_log", &found);
    if (found) s_cli_serial_log = val;

    val = mg_json_get_bool(hm->body, "$.cli.telnet_auth", &found);
    if (found) s_cli_telnet_auth = val;

    // Parse UDP forward flags
    val = mg_json_get_bool(hm->body, "$.udp_forward.tool_rx", &found);
    if (found) s_udp_forward.tool_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.tool_tx", &found);
    if (found) s_udp_forward.tool_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.screen_rx", &found);
    if (found) s_udp_forward.screen_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.screen_tx", &found);
    if (found) s_udp_forward.screen_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.op1_rx", &found);
    if (found) s_udp_forward.op1_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.op1_tx", &found);
    if (found) s_udp_forward.op1_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.op2_rx", &found);
    if (found) s_udp_forward.op2_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.op2_tx", &found);
    if (found) s_udp_forward.op2_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.mbtcp1_rx", &found);
    if (found) s_udp_forward.mbtcp1_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.mbtcp1_tx", &found);
    if (found) s_udp_forward.mbtcp1_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.mbtcp2_rx", &found);
    if (found) s_udp_forward.mbtcp2_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.mbtcp2_tx", &found);
    if (found) s_udp_forward.mbtcp2_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.mbtcp3_rx", &found);
    if (found) s_udp_forward.mbtcp3_rx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.mbtcp3_tx", &found);
    if (found) s_udp_forward.mbtcp3_tx = val;
    val = mg_json_get_bool(hm->body, "$.udp_forward.udp_log", &found);
    if (found) s_udp_forward.udp_log = val;

    // Parse operation log flags
    val = mg_json_get_bool(hm->body, "$.op_log.io", &found);
    if (found) s_op_log.io = val;
    val = mg_json_get_bool(hm->body, "$.op_log.mbtcp", &found);
    if (found) s_op_log.mbtcp = val;
    val = mg_json_get_bool(hm->body, "$.op_log.op", &found);
    if (found) s_op_log.op = val;
    val = mg_json_get_bool(hm->body, "$.op_log.tool", &found);
    if (found) s_op_log.tool = val;
    val = mg_json_get_bool(hm->body, "$.op_log.screen", &found);
    if (found) s_op_log.screen = val;

    MG_INFO(("Debug settings updated"));
    api_reply_ok(c, NULL);
}

// Handle POST /api/debug/save - Persist debug settings to storage
static void handle_debug_save(struct mg_connection *c,
                              struct mg_http_message *hm,
                              struct user *u) {
    (void) hm;
    (void) u;

    // Simulator: just log and return success
    MG_INFO(("Debug settings saved to storage (simulated)"));
    api_reply_ok(c, NULL);
}

// -----------------------------------------------------------------------------
// Log API Handlers
// -----------------------------------------------------------------------------

// Simulate logs directory path (relative to project root for VSCode debugging)
#define SIM_LOGS_DIR "webserver/simulate/Logs"

// Context structure for directory listing callback
struct log_list_ctx {
    char *p;
    size_t remain;
    int count;
};

// Callback for mg_fs_posix.ls()
static void log_list_cb(const char *name, void *data) {
    struct log_list_ctx *ctx = (struct log_list_ctx *)data;

    // Skip . and ..
    if (name[0] == '.') return;

    // Get file size using Mongoose fs API
    char path[256];
    mg_snprintf(path, sizeof(path), "%s/%s", SIM_LOGS_DIR, name);
    size_t fsize = 0;
    time_t mtime = 0;
    int flags = mg_fs_posix.st(path, &fsize, &mtime);

    // Skip if not a file
    if (!(flags & MG_FS_READ)) return;

    int n = mg_snprintf(ctx->p, ctx->remain, "%s{\"name\":%m,\"size\":%lu,\"type\":\"file\"}",
                        ctx->count > 0 ? "," : "",
                        MG_ESC(name),
                        (unsigned long)fsize);
    ctx->p += n;
    ctx->remain -= (size_t)n;
    ctx->count++;
}

static void handle_log_list(struct mg_connection *c,
                            struct mg_http_message *hm,
                            struct user *u) {
    (void) hm;
    (void) u;

    char json[2048];
    struct log_list_ctx ctx = {json, sizeof(json), 0};
    int n;

    n = mg_snprintf(ctx.p, ctx.remain, "{\"logs\":[");
    ctx.p += n; ctx.remain -= (size_t)n;

    // 1. List file logs from simulate/Logs directory using Mongoose fs API
    mg_fs_posix.ls(SIM_LOGS_DIR, log_list_cb, &ctx);

    // 2. Add memory logs
    for (int i = 0; s_memory_logs[i].name != NULL; i++) {
        n = mg_snprintf(ctx.p, ctx.remain, "%s{\"name\":%m,\"size\":%d,\"type\":%m}",
                        ctx.count > 0 ? "," : "",
                        MG_ESC(s_memory_logs[i].name), s_memory_logs[i].size,
                        MG_ESC(s_memory_logs[i].type));
        ctx.p += n; ctx.remain -= (size_t)n;
        ctx.count++;
    }

    mg_snprintf(ctx.p, ctx.remain, "]}");
    api_reply_ok(c, json);
}

static void handle_log_download(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u) {
    (void) u;

    char name[64], offset_str[20], size_str[20];
    int offset = 0, size = 1024;

    mg_http_get_var(&hm->query, "name", name, sizeof(name));
    mg_http_get_var(&hm->query, "offset", offset_str, sizeof(offset_str));
    mg_http_get_var(&hm->query, "size", size_str, sizeof(size_str));

    if (offset_str[0]) offset = (int) strtol(offset_str, NULL, 10);
    if (size_str[0]) size = (int) strtol(size_str, NULL, 10);
    if (size > 1024) size = 1024;  // Max chunk size

    // Check if it's a memory log
    const char *content = NULL;
    for (int i = 0; s_memory_logs[i].name != NULL; i++) {
        if (strcmp(s_memory_logs[i].name, name) == 0) {
            // Memory log found
            if (strcmp(name, "boot.log") == 0) {
                content = s_boot_log_content;
            } else if (strcmp(name, "recent.log") == 0) {
                content = s_recent_log_content;
            }
            break;
        }
    }

    if (content != NULL) {
        // Memory log: return content chunk
        int content_len = (int) strlen(content);
        if (offset >= content_len) {
            offset = content_len;
            size = 0;
        } else if (offset + size > content_len) {
            size = content_len - offset;
        }

        char json[2048];
        mg_snprintf(json, sizeof(json),
            "{\"offset\":%d,\"size\":%d,\"content\":%m}",
            offset, size, mg_print_esc, size, content + offset);
        api_reply_ok(c, json);
        return;
    }

    // File log: serve from simulate/Logs directory
    // Security check: prevent path traversal
    if (strchr(name, '/') != NULL || strchr(name, '\\') != NULL ||
        strcmp(name, "..") == 0) {
        api_reply_fail(c, ERR_INVALID_PARAM, "Invalid log name");
        return;
    }

    char path[256];
    mg_snprintf(path, sizeof(path), "%s/%s", SIM_LOGS_DIR, name);

    // Check if file exists using Mongoose fs API
    size_t fsize = 0;
    time_t mtime = 0;
    int flags = mg_fs_posix.st(path, &fsize, &mtime);
    if (!(flags & MG_FS_READ)) {
        api_reply_fail(c, ERR_INVALID_PARAM, "Log not found");
        return;
    }

    // Build Content-Disposition header with filename
    char headers[256];
    mg_snprintf(headers, sizeof(headers),
                "Content-Disposition: attachment; filename=\"%s\"\r\n", name);

    struct mg_http_serve_opts opts = {0};
    opts.extra_headers = headers;
    mg_http_serve_file(c, hm, path, &opts);
}

// -----------------------------------------------------------------------------
// Reboot Handler
// -----------------------------------------------------------------------------
static void handle_reboot(struct mg_connection *c,
                          struct mg_http_message *hm,
                          struct user *u) {
    (void) hm;
    (void) u;

    api_reply_ok(c, NULL);
    MG_INFO(("Reboot requested (simulator mode - no action)"));
}

// -----------------------------------------------------------------------------
// API Handler Registry
// -----------------------------------------------------------------------------
struct api_handler s_api_handlers[] = {
    // Dashboard module
    {"/api/dashboard", PERM_READONLY, handle_dashboard},
    {"/api/tool",      PERM_READONLY, handle_tool},

    // Settings module
    {"/api/settings/system",    PERM_ADMIN,    handle_settings_system},
    {"/api/settings/ver",       PERM_ADMIN,    handle_settings_ver},
    {"/api/settings/network",   PERM_ADMIN,    handle_settings_network},
    {"/api/settings/sync-time", PERM_ADMIN,    handle_settings_sync_time},
    {"/api/settings",           PERM_READONLY, handle_settings_get},

    // Firmware module
    {"/api/firmware/begin",  PERM_ADMIN, handle_firmware_begin},
    {"/api/firmware/upload", PERM_ADMIN, handle_firmware_upload},

    // Debug module (GET/POST both handled in handle_debug_get)
    {"/api/debug/save", PERM_ADMIN, handle_debug_save},
    {"/api/debug", PERM_ADMIN, handle_debug_get},

    // Log module
    {"/api/log/download", PERM_ADMIN, handle_log_download},
    {"/api/log",          PERM_ADMIN, handle_log_list},

    // System
    {"/api/reboot",    PERM_ADMIN,    handle_reboot},

    // End marker
    {NULL, 0, NULL}
};

// -----------------------------------------------------------------------------
// WebSocket Status Push Timer
// -----------------------------------------------------------------------------
static void timer_status_push(void *arg) {
    struct mg_mgr *mgr = (struct mg_mgr *) arg;

    // Get current UTC time
    time_t now = time(NULL);

    // Build status JSON
    char json[256];
    mg_snprintf(json, sizeof(json),
        "{\"type\":\"status\",\"data\":{"
        "\"tool_state\":%d,\"tool_change\":%s,"
        "\"sram_used\":%d,\"sram_max\":%d,"
        "\"sdram_used\":%d,\"sdram_max\":%d,"
        "\"time\":%lu,\"tz_offset\":%d}}",
        s_tool_state, s_tool_change ? "true" : "false",
        s_sram_used, s_sram_max,
        s_sdram_used, s_sdram_max,
        (unsigned long) now, s_tz_offset);

    ws_broadcast(mgr, json);
}

// -----------------------------------------------------------------------------
// Main Event Handler
// -----------------------------------------------------------------------------
static void ev_handler(struct mg_connection *c, int ev, void *ev_data) {
    http_ev_handler(c, ev, ev_data);
}

// -----------------------------------------------------------------------------
// Web Server Initialization
// -----------------------------------------------------------------------------
void web_init(struct mg_mgr *mgr) {
    s_mgr = mgr;

    // Start HTTP listener
    mg_http_listen(mgr, HTTP_URL, ev_handler, NULL);
    MG_INFO(("HTTP listener started on %s", HTTP_URL));

    // Add status push timer (every 3 seconds)
    mg_timer_add(mgr, 3000, MG_TIMER_REPEAT, timer_status_push, mgr);
    MG_INFO(("Simulator mode: status push timer started"));
}

#endif  // !WEBSERVER_USER

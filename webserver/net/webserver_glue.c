// Copyright (c) 2026
// Web Server Glue Layer - Business logic, user management, API handlers

#include "webserver_glue.h"
#include "webserver_impl.h"

#include <string.h>
#include <time.h>

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
#if !defined(WEBSERVER_USER)

// Simulated device info
static const char *s_device_name = "示教器-01";
static const char *s_device_firmware = "1.0.0";
static const char *s_device_hardware = "2.0";
static const char *s_device_serial = "SN123456";
static const char *s_device_ip = "192.168.1.100";
static const char *s_device_mac = "AA:BB:CC:DD:EE:FF";

// Simulated tool info
static int s_tool_state = 2;  // 0=offline, 1=connecting, 2=online
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

// Log module: Simulated log entries
static struct {
    const char *name;
    int size;
    const char *type;  // "file" or "memory"
} s_logs[] = {
    {"system.log", 102400, "file"},
    {"error.log",  20480,  "file"},
    {"boot.log",   8192,   "memory"},
    {"recent.log", 16384,  "memory"},
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

#endif  // !WEBSERVER_USER

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

#if !defined(WEBSERVER_USER)
    // Simulator: return mock data
    char json[512];
    mg_snprintf(json, sizeof(json),
        "{\"device\":{\"name\":%m,\"firmware\":%m,\"hardware\":%m,\"serial\":%m},"
        "\"network\":{\"ip\":%m,\"mac\":%m}}",
        MG_ESC(s_device_name), MG_ESC(s_device_firmware),
        MG_ESC(s_device_hardware), MG_ESC(s_device_serial),
        MG_ESC(s_device_ip), MG_ESC(s_device_mac));
    api_reply_ok(c, json);
#else
    // Real device: user implements data retrieval
    // TODO: Call actual hardware functions
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_tool(struct mg_connection *c,
                        struct mg_http_message *hm,
                        struct user *u) {
    (void) hm;
    (void) u;

#if !defined(WEBSERVER_USER)
    // Simulator: return mock data
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
#else
    // Real device: user implements data retrieval
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

// -----------------------------------------------------------------------------
// Settings API Handlers
// -----------------------------------------------------------------------------
static void handle_settings_get(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u) {
    (void) hm;
    (void) u;

#if !defined(WEBSERVER_USER)
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
#else
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_settings_system(struct mg_connection *c,
                                   struct mg_http_message *hm,
                                   struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
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
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_settings_ver(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
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
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_settings_network(struct mg_connection *c,
                                    struct mg_http_message *hm,
                                    struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
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
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_settings_sync_time(struct mg_connection *c,
                                      struct mg_http_message *hm,
                                      struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
    long ts = mg_json_get_long(hm->body, "$.timestamp", 0);
    MG_INFO(("Sync time received: %ld (simulator - ignored)", ts));
    api_reply_ok(c, NULL);
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

// -----------------------------------------------------------------------------
// Firmware API Handlers
// -----------------------------------------------------------------------------
#if !defined(WEBSERVER_USER)
static char s_fw_name[64] = "";
static size_t s_fw_size = 0;
static size_t s_fw_written = 0;
#endif

static void handle_firmware_begin(struct mg_connection *c,
                                  struct mg_http_message *hm,
                                  struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
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

    // Simulate flash erase (in real device, call actual erase function)
    api_reply_ok(c, NULL);
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_firmware_upload(struct mg_connection *c,
                                   struct mg_http_message *hm,
                                   struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
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
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
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

#if !defined(WEBSERVER_USER)
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
#else
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_debug_set(struct mg_connection *c,
                             struct mg_http_message *hm,
                             struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
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
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

// Handle POST /api/debug/save - Persist debug settings to storage
static void handle_debug_save(struct mg_connection *c,
                              struct mg_http_message *hm,
                              struct user *u) {
    (void) hm;
    (void) u;

#if !defined(WEBSERVER_USER)
    // Simulator: just log and return success
    MG_INFO(("Debug settings saved to storage (simulated)"));
    api_reply_ok(c, NULL);
#else
    // Real device: save debug settings to flash/EEPROM
    // TODO: User implementation
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

// -----------------------------------------------------------------------------
// Log API Handlers
// -----------------------------------------------------------------------------
static void handle_log_list(struct mg_connection *c,
                            struct mg_http_message *hm,
                            struct user *u) {
    (void) hm;
    (void) u;

#if !defined(WEBSERVER_USER)
    char json[1024];
    char *p = json;
    size_t remain = sizeof(json);
    int n;

    n = mg_snprintf(p, remain, "{\"logs\":[");
    p += n; remain -= (size_t)n;

    for (int i = 0; s_logs[i].name != NULL; i++) {
        n = mg_snprintf(p, remain, "%s{\"name\":%m,\"size\":%d,\"type\":%m}",
                        i > 0 ? "," : "",
                        MG_ESC(s_logs[i].name), s_logs[i].size, MG_ESC(s_logs[i].type));
        p += n; remain -= (size_t)n;
    }

    mg_snprintf(p, remain, "]}");
    api_reply_ok(c, json);
#else
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
}

static void handle_log_download(struct mg_connection *c,
                                struct mg_http_message *hm,
                                struct user *u) {
    (void) u;

#if !defined(WEBSERVER_USER)
    char name[64], offset_str[20], size_str[20];
    int offset = 0, size = 1024;

    mg_http_get_var(&hm->query, "name", name, sizeof(name));
    mg_http_get_var(&hm->query, "offset", offset_str, sizeof(offset_str));
    mg_http_get_var(&hm->query, "size", size_str, sizeof(size_str));

    if (offset_str[0]) offset = (int) strtol(offset_str, NULL, 10);
    if (size_str[0]) size = (int) strtol(size_str, NULL, 10);
    if (size > 1024) size = 1024;  // Max chunk size

    // Find the log entry
    const char *content = NULL;
    const char *type = NULL;
    for (int i = 0; s_logs[i].name != NULL; i++) {
        if (strcmp(s_logs[i].name, name) == 0) {
            type = s_logs[i].type;
            break;
        }
    }

    if (type == NULL) {
        api_reply_fail(c, ERR_INVALID_PARAM, "Log not found");
        return;
    }

    // For file type, serve as file download (simulator: not implemented)
    if (strcmp(type, "file") == 0) {
        // In real device, use mg_http_serve_file
        // Simulator: return error
        api_reply_fail(c, ERR_INVALID_PARAM, "File log not available in simulator");
        return;
    }

    // For memory type, return content chunk
    if (strcmp(name, "boot.log") == 0) {
        content = s_boot_log_content;
    } else if (strcmp(name, "recent.log") == 0) {
        content = s_recent_log_content;
    } else {
        api_reply_fail(c, ERR_INVALID_PARAM, "Unknown memory log");
        return;
    }

    // Calculate chunk
    int content_len = (int) strlen(content);
    if (offset >= content_len) {
        offset = content_len;
        size = 0;
    } else if (offset + size > content_len) {
        size = content_len - offset;
    }

    // Build response with escaped content
    char json[2048];
    mg_snprintf(json, sizeof(json),
        "{\"offset\":%d,\"size\":%d,\"content\":%m}",
        offset, size, mg_print_esc, size, content + offset);
    api_reply_ok(c, json);
#else
    (void) hm;
    api_reply_fail(c, ERR_INVALID_PARAM, "Not implemented");
#endif
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

#if defined(WEBSERVER_USER)
    // Real device: trigger reboot
    // TODO: Call system reboot function
#else
    // Simulator: just log
    MG_INFO(("Reboot requested (simulator mode - no action)"));
#endif
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
// WebSocket Status Push Timer (Simulator only)
// -----------------------------------------------------------------------------
#if !defined(WEBSERVER_USER)
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
#endif

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

    // HTTPS listener would need TLS setup
    // mg_http_listen(mgr, HTTPS_URL, ev_handler, (void *) 1);

#if !defined(WEBSERVER_USER)
    // Simulator mode: add status push timer (every 3 seconds)
    mg_timer_add(mgr, 3000, MG_TIMER_REPEAT, timer_status_push, mgr);
    MG_INFO(("Simulator mode: status push timer started"));
#endif
}

// Copyright (c) 2026
// Web Server Implementation Layer - Protocol handling, routing, TLS

#include "webserver_impl.h"
#include "webserver_glue.h"

#include <string.h>

// -----------------------------------------------------------------------------
// JSON Header for API responses
// -----------------------------------------------------------------------------
static const char *s_json_header =
    "Content-Type: application/json\r\n"
    "Cache-Control: no-cache\r\n";

// -----------------------------------------------------------------------------
// Business Response Functions
// -----------------------------------------------------------------------------
void api_reply_ok(struct mg_connection *c, const char *data_json) {
    if (data_json == NULL || data_json[0] == '\0') {
        mg_http_reply(c, 200, s_json_header, "{%m:true}\n", MG_ESC("ack"));
    } else {
        mg_http_reply(c, 200, s_json_header, "{%m:true,%m:%s}\n",
                      MG_ESC("ack"), MG_ESC("data"), data_json);
    }
}

void api_reply_fail(struct mg_connection *c, int code, const char *message) {
    const char *fail_msg = message ? message : "";

    mg_http_reply(c, 200, s_json_header,
                  "{%m:false,%m:{%m:%d,%m:%m}}\n",
                  MG_ESC("ack"), MG_ESC("error"),
                  MG_ESC("code"), code,
                  MG_ESC("message"), MG_ESC(fail_msg));
}

// -----------------------------------------------------------------------------
// WebSocket Broadcast
// -----------------------------------------------------------------------------
void ws_broadcast(struct mg_mgr *mgr, const char *json) {
    for (struct mg_connection *c = mgr->conns; c != NULL; c = c->next) {
        if (c->is_websocket) {
            mg_ws_send(c, json, strlen(json), WEBSOCKET_OP_TEXT);
        }
    }
}

// -----------------------------------------------------------------------------
// Login Handler
// -----------------------------------------------------------------------------
static void handle_login(struct mg_connection *c, struct user *u) {
    if (u == NULL) {
        HTTP_REPLY_401(c);
        return;
    }

    char cookie[256];
    mg_snprintf(cookie, sizeof(cookie),
                "Set-Cookie: access_token=%s; Path=/; "
                "HttpOnly; SameSite=Lax; Max-Age=%d\r\n",
                u->token, 3600 * 24);
    mg_http_reply(c, 200, cookie, "{%m:%m,%m:%d}\n",
                  MG_ESC("user"), MG_ESC(u->name),
                  MG_ESC("level"), u->level);
}

// -----------------------------------------------------------------------------
// Logout Handler
// -----------------------------------------------------------------------------
static void handle_logout(struct mg_connection *c) {
    const char *cookie =
        "Set-Cookie: access_token=; Path=/; "
        "Expires=Thu, 01 Jan 1970 00:00:00 UTC; "
        "HttpOnly; Max-Age=0\r\n";
    mg_http_reply(c, 200, cookie, "{%m:true}\n", MG_ESC("ack"));
}

// -----------------------------------------------------------------------------
// Find API Handler from registry
// -----------------------------------------------------------------------------
static struct api_handler *find_api_handler(struct mg_http_message *hm) {
    extern struct api_handler s_api_handlers[];

    for (struct api_handler *h = s_api_handlers; h->pattern != NULL; h++) {
        if (mg_match(hm->uri, mg_str(h->pattern), NULL)) {
            return h;
        }
    }
    return NULL;
}

// -----------------------------------------------------------------------------
// HTTP Event Handler
// -----------------------------------------------------------------------------
void http_ev_handler(struct mg_connection *c, int ev, void *ev_data) {
    if (ev == MG_EV_HTTP_MSG) {
        struct mg_http_message *hm = (struct mg_http_message *) ev_data;
        struct user *u = glue_authenticate(hm);

        MG_DEBUG(("%lu %.*s %.*s", c->id,
                  (int) hm->method.len, hm->method.buf,
                  (int) hm->uri.len, hm->uri.buf));

        // Login - special case, can be accessed without token
        if (mg_match(hm->uri, mg_str("/api/login"), NULL)) {
            handle_login(c, u);
        }
        // Logout
        else if (mg_match(hm->uri, mg_str("/api/logout"), NULL)) {
            handle_logout(c);
        }
        // All other APIs require authentication
        else if (mg_match(hm->uri, mg_str("/api/#"), NULL)) {
            if (u == NULL) {
                HTTP_REPLY_401(c);
            } else {
                // Find handler in registry
                struct api_handler *h = find_api_handler(hm);
                if (h == NULL) {
                    HTTP_REPLY_404(c);
                } else if (u->level < h->min_level) {
                    HTTP_REPLY_403(c);
                } else {
                    h->handler(c, hm, u);
                }
            }
        }
        // WebSocket upgrade
        else if (mg_match(hm->uri, mg_str("/ws"), NULL)) {
            if (u == NULL) {
                HTTP_REPLY_401(c);
            } else {
                mg_ws_upgrade(c, hm, NULL);
            }
        }
        // Static files
        else {
            struct mg_http_serve_opts opts = {0};
            opts.root_dir = WEBSERVER_ROOT;
            opts.page404 = WEBSERVER_PAGE404;
#if defined(BUILD_PACKED_FS)
            opts.fs = &mg_fs_packed;
#endif
            mg_http_serve_dir(c, hm, &opts);
        }

        // HTTP short connection: close after response (except WebSocket)
        if (!c->is_websocket) {
            c->is_draining = 1;
        }
    }
    else if (ev == MG_EV_WS_MSG) {
        // WebSocket message - currently just echo or ignore
        // struct mg_ws_message *wm = (struct mg_ws_message *) ev_data;
        // Handle WebSocket messages if needed
    }
}

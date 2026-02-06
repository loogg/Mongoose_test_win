// Copyright (c) 2026
// Web Server Implementation Layer - Protocol handling, routing, TLS
#pragma once

#include "mongoose.h"

#ifdef __cplusplus
extern "C" {
#endif

#ifndef WEBSERVER_ROOT
#define WEBSERVER_ROOT "/webroot/dist"
#endif

#ifndef WEBSERVER_PAGE404
#define WEBSERVER_PAGE404 "/webroot/dist/index.html"
#endif

// -----------------------------------------------------------------------------
// User structure for authentication
// -----------------------------------------------------------------------------
struct user {
    char name[64];
    char pass[64];
    char token[128];
    int level;
};

// -----------------------------------------------------------------------------
// API Handler types
// -----------------------------------------------------------------------------
typedef void (*api_handler_fn)(struct mg_connection *c,
                               struct mg_http_message *hm,
                               struct user *u);

struct api_handler {
    const char *pattern;     // URL pattern (e.g., "/api/settings")
    int min_level;           // Minimum permission level required
    api_handler_fn handler;  // Handler function
};

// -----------------------------------------------------------------------------
// HTTP Error Response Macros (Protocol layer)
// -----------------------------------------------------------------------------
#define HTTP_REPLY_400(c) mg_http_reply(c, 400, "", "Bad Request\n")
#define HTTP_REPLY_401(c) mg_http_reply(c, 401, "", "Unauthorized\n")
#define HTTP_REPLY_403(c) mg_http_reply(c, 403, "", "Forbidden\n")
#define HTTP_REPLY_404(c) mg_http_reply(c, 404, "", "Not Found\n")
#define HTTP_REPLY_500(c) mg_http_reply(c, 500, "", "Internal Server Error\n")

// -----------------------------------------------------------------------------
// Business Response Functions (Application layer)
// -----------------------------------------------------------------------------
void api_reply_ok(struct mg_connection *c, const char *data_json);
void api_reply_fail(struct mg_connection *c, int code, const char *message);

// -----------------------------------------------------------------------------
// WebSocket Broadcast
// -----------------------------------------------------------------------------
void ws_broadcast(struct mg_mgr *mgr, const char *json);

// -----------------------------------------------------------------------------
// HTTP Event Handler (called by glue layer)
// -----------------------------------------------------------------------------
void http_ev_handler(struct mg_connection *c, int ev, void *ev_data);

#ifdef __cplusplus
}
#endif

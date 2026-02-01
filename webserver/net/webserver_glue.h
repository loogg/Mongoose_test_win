// Copyright (c) 2026
// Web Server Glue Layer - Business logic, user management, API handlers
#pragma once

#include "webserver_impl.h"

#ifdef __cplusplus
extern "C" {
#endif

// -----------------------------------------------------------------------------
// Port Configuration
// -----------------------------------------------------------------------------
#if !defined(HTTP_URL)
#define HTTP_URL "http://0.0.0.0:80"
#endif

#if !defined(HTTPS_URL)
#define HTTPS_URL "https://0.0.0.0:443"
#endif

// -----------------------------------------------------------------------------
// Permission Levels
// -----------------------------------------------------------------------------
#define PERM_NONE     0   // Not logged in
#define PERM_READONLY 1   // Read-only user
#define PERM_USER     3   // Normal user
#define PERM_ADMIN    7   // Administrator

// -----------------------------------------------------------------------------
// Error Codes
// -----------------------------------------------------------------------------
#define ERR_INVALID_PARAM    1001  // Invalid parameter
#define ERR_RESOURCE_CONFLICT 1002 // Resource conflict
#define ERR_OTA_BEGIN_FAILED 2000  // OTA begin failed (flash erase)
#define ERR_OTA_WRITE_FAILED 2001  // OTA write failed

// -----------------------------------------------------------------------------
// Glue Layer Functions
// -----------------------------------------------------------------------------

// Initialize web server
void web_init(struct mg_mgr *mgr);

// Authenticate user from HTTP request (Basic Auth or Cookie)
struct user *glue_authenticate(struct mg_http_message *hm);

// Get manager pointer (for WebSocket broadcast)
struct mg_mgr *glue_get_mgr(void);

#ifdef __cplusplus
}
#endif

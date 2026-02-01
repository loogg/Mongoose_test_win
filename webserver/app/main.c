#include "mongoose.h"
#include "webserver_glue.h"

int main(void) {
  struct mg_mgr mgr;

  mg_mgr_init(&mgr);
  mg_log_set(MG_LL_DEBUG);

  // Initialize web server
  web_init(&mgr);

  MG_INFO(("Starting Mongoose event loop..."));

  // Infinite event loop
  for (;;) {
    mg_mgr_poll(&mgr, 1000);
  }

  mg_mgr_free(&mgr);
  return 0;
}

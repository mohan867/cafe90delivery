import logging
import sys
import time
from flask import request, g

# Configure root logger to output to stdout
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("cafe90s")

def setup_request_logging(app):
    """
    Attaches before_request and after_request hooks to log every HTTP request
    with Method, Path, Status Code, and Duration.
    """
    @app.before_request
    def start_timer():
        g.start_time = time.time()

    @app.after_request
    def log_request(response):
        if hasattr(g, "start_time"):
            duration = (time.time() - g.start_time) * 1000
            duration_str = f"{duration:.2f}ms"
        else:
            duration_str = "unknown"

        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        method = request.method
        path = request.path
        status = response.status_code

        log_msg = f"{ip} - \"{method} {path}\" {status} ({duration_str})"

        if status >= 500:
            logger.error(log_msg)
        elif status >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        return response

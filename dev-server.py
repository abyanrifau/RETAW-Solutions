"""Local preview server that mirrors Vercel's cleanUrls: /savings serves savings.html,
and /savings.html redirects to /savings. Not deployed (see .vercelignore).

Usage: python dev-server.py [port]   (default 5173)
"""
import http.server
import os
import sys
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanUrlHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        parts = urlsplit(self.path)
        path = parts.path
        query = ("?" + parts.query) if parts.query else ""

        # /page.html -> /page and /index(.html) -> /  (permanent redirect, like Vercel)
        if path.endswith(".html") or path == "/index":
            target = path[:-5] if path.endswith(".html") else path
            if target.endswith("/index"):
                target = target[: -len("index")]
            self.send_response(308)
            self.send_header("Location", target + query)
            self.end_headers()
            return

        # /page -> page.html when that file exists
        local = os.path.join(ROOT, path.lstrip("/"))
        if path != "/" and not os.path.splitext(path)[1] and os.path.isfile(local + ".html"):
            self.path = path + ".html" + query
        return super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    http.server.ThreadingHTTPServer(("", port), CleanUrlHandler).serve_forever()

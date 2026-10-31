import http.server
import socketserver
import os
import sys

PORT = 5173
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Resolve target file path
        req_path = self.path.split('?')[0].split('#')[0]
        local_path = os.path.join(DIST_DIR, req_path.lstrip('/'))
        
        # If static file or directory exists, serve normally; otherwise fallback to index.html
        if os.path.exists(local_path) and not os.path.isdir(local_path):
            return super().do_GET()
        elif req_path == '/' or not os.path.exists(local_path):
            self.path = '/index.html'
            return super().do_GET()
        return super().do_GET()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Paul Photography server running at http://localhost:{PORT}")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

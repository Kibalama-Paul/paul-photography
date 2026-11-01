import http.server
import socketserver
import os
import sys
import json
from datetime import datetime

PORT = 5173
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
BOOKINGS_FILE = os.path.join(DATA_DIR, 'bookings.json')

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(BOOKINGS_FILE):
    with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

def read_bookings():
    try:
        if os.path.exists(BOOKINGS_FILE):
            with open(BOOKINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"[API] Error reading bookings: {e}")
    return []

def write_bookings(bookings):
    try:
        with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(bookings, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[API] Error saving bookings: {e}")
        return False

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        req_path = self.path.split('?')[0].split('#')[0]

        # API: Bookings List
        if req_path == '/api/bookings':
            bookings = read_bookings()
            payload = json.dumps(bookings).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._set_cors_headers()
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # SPA & Static file serving
        local_path = os.path.join(DIST_DIR, req_path.lstrip('/'))
        if os.path.exists(local_path) and not os.path.isdir(local_path):
            return super().do_GET()
        elif req_path == '/' or not os.path.exists(local_path):
            self.path = '/index.html'
            return super().do_GET()
        return super().do_GET()

    def do_POST(self):
        req_path = self.path.split('?')[0].split('#')[0]

        if req_path == '/api/bookings' or req_path == '/api/bookings/save':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                new_booking = json.loads(body)
                bookings = read_bookings()

                # Deduplicate or update existing
                existing_idx = next((i for i, b in enumerate(bookings) if b.get('id') == new_booking.get('id')), None)
                if existing_idx is not None:
                    bookings[existing_idx] = {**bookings[existing_idx], **new_booking}
                else:
                    bookings.insert(0, new_booking)

                write_bookings(bookings)

                response_data = json.dumps({'success': True, 'booking': new_booking, 'bookings': bookings}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self._set_cors_headers()
                self.send_header('Content-Length', str(len(response_data)))
                self.end_headers()
                self.wfile.write(response_data)
                return
            except Exception as e:
                err = json.dumps({'success': False, 'error': str(e)}).encode('utf-8')
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(err)
                return

        if req_path == '/api/bookings/approve' or req_path.startswith('/api/bookings/approve/'):
            content_length = int(self.headers.get('Content-Length', 0))
            booking_id = None
            if content_length > 0:
                try:
                    payload = json.loads(self.rfile.read(content_length).decode('utf-8'))
                    booking_id = payload.get('id')
                except:
                    pass
            if not booking_id and '/' in req_path[len('/api/bookings/approve'):]:
                booking_id = req_path.split('/')[-1]

            if booking_id:
                bookings = read_bookings()
                ts = datetime.utcnow().isoformat() + 'Z'
                for b in bookings:
                    if b.get('id') == booking_id:
                        b['adminApproved'] = True
                        b['adminApprovedAt'] = ts
                        b['status'] = 'confirmed'
                write_bookings(bookings)

                res = json.dumps({'success': True, 'id': booking_id, 'approvedAt': ts, 'bookings': bookings}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

        self.send_response(404)
        self._set_cors_headers()
        self.end_headers()

    def do_PUT(self):
        req_path = self.path.split('?')[0].split('#')[0]
        # /api/bookings/:id or /api/bookings
        parts = req_path.strip('/').split('/')
        booking_id = parts[-1] if len(parts) >= 3 else None

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            patch_data = json.loads(body)
            if not booking_id:
                booking_id = patch_data.get('id')

            bookings = read_bookings()
            for b in bookings:
                if b.get('id') == booking_id:
                    b.update(patch_data)
            write_bookings(bookings)

            res = json.dumps({'success': True, 'bookings': bookings}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(res)
        except Exception as e:
            self.send_response(400)
            self._set_cors_headers()
            self.end_headers()

    def do_DELETE(self):
        req_path = self.path.split('?')[0].split('#')[0]
        parts = req_path.strip('/').split('/')
        booking_id = parts[-1] if len(parts) >= 3 else None

        if booking_id:
            bookings = read_bookings()
            bookings = [b for b in bookings if b.get('id') != booking_id]
            write_bookings(bookings)
            res = json.dumps({'success': True, 'id': booking_id, 'bookings': bookings}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(res)
            return

        self.send_response(400)
        self._set_cors_headers()
        self.end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    # Bind to "" (0.0.0.0) so all IP addresses on the network can connect
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Paul Photography server running at http://0.0.0.0:{PORT}")
        print(f"Accessible via all network IPs and localhost:{PORT}")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

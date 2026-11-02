import http.server
import socketserver
import os
import sys
import json
from datetime import datetime

PORT = 5173
PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(PROJECT_DIR, 'dist')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')
BOOKINGS_FILE = os.path.join(DATA_DIR, 'bookings.json')
GALLERY_FILE = os.path.join(PROJECT_DIR, 'src', 'data', 'galleryData.json')
PORTFOLIO_FILE = os.path.join(DATA_DIR, 'portfolio.json')

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(BOOKINGS_FILE):
    with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

if not os.path.exists(PORTFOLIO_FILE):
    with open(PORTFOLIO_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

def read_json_file(filepath):
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"[API] Error reading {filepath}: {e}")
    return []

def write_json_file(filepath, data):
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[API] Error writing {filepath}: {e}")
        return False

def read_bookings():
    return read_json_file(BOOKINGS_FILE)

def write_bookings(bookings):
    return write_json_file(BOOKINGS_FILE, bookings)

def read_gallery():
    raw = read_json_file(GALLERY_FILE)
    if isinstance(raw, dict) and 'gallery' in raw:
        return raw['gallery']
    return raw if isinstance(raw, list) else []

def write_gallery(items):
    existing = read_json_file(GALLERY_FILE)
    if isinstance(existing, dict) and 'portfolio' in existing:
        unified = {
            'gallery': items,
            'portfolio': existing['portfolio'],
            'updatedAt': datetime.now().isoformat()
        }
        return write_json_file(GALLERY_FILE, unified)
    return write_json_file(GALLERY_FILE, items)

def read_portfolio():
    raw_p = read_json_file(PORTFOLIO_FILE)
    if isinstance(raw_p, list) and len(raw_p) > 0:
        return raw_p
    existing = read_json_file(GALLERY_FILE)
    if isinstance(existing, dict) and 'portfolio' in existing:
        return existing['portfolio']
    return raw_p if isinstance(raw_p, list) else []

def write_portfolio(items):
    write_json_file(PORTFOLIO_FILE, items)
    existing = read_json_file(GALLERY_FILE)
    if isinstance(existing, dict):
        existing['portfolio'] = items
        existing['updatedAt'] = datetime.now().isoformat()
        write_json_file(GALLERY_FILE, existing)
    elif isinstance(existing, list):
        unified = {
            'gallery': existing,
            'portfolio': items,
            'updatedAt': datetime.now().isoformat()
        }
        write_json_file(GALLERY_FILE, unified)
    return True

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

        # API: Gallery List
        if req_path == '/api/gallery':
            items = read_gallery()
            payload = json.dumps(items).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._set_cors_headers()
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # API: Portfolio List
        if req_path == '/api/portfolio':
            items = read_portfolio()
            payload = json.dumps(items).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._set_cors_headers()
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # API: Cloud Sync proxy (GET)
        if req_path == '/api/cloud-sync':
            import urllib.request, urllib.parse
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            bin_id = params.get('bin', [None])[0]
            if bin_id:
                try:
                    req = urllib.request.Request(f'https://extendsclass.com/api/json-storage/bin/{bin_id}?_t={int(datetime.utcnow().timestamp()*1000)}')
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        data = resp.read()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self._set_cors_headers()
                        self.send_header('Content-Length', str(len(data)))
                        self.end_headers()
                        self.wfile.write(data)
                        return
                except Exception as e:
                    err = json.dumps({'error': str(e)}).encode('utf-8')
                    self.send_response(502)
                    self.send_header('Content-Type', 'application/json')
                    self._set_cors_headers()
                    self.end_headers()
                    self.wfile.write(err)
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

        # Order creation - Immediate 202 Accepted response
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

                # Return immediate 202 Accepted with lean payload
                response_data = json.dumps({'success': True, 'id': new_booking.get('id'), 'status': 'accepted'}).encode('utf-8')
                self.send_response(202)
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

        # Booking approval
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

                res = json.dumps({'success': True, 'id': booking_id, 'approvedAt': ts, 'status': 'confirmed'}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

        # Gallery Export All (Full backup of Gallery and Portfolio)
        if req_path == '/api/gallery/export-all':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                write_json_file(GALLERY_FILE, payload)
                if isinstance(payload, dict) and 'portfolio' in payload and isinstance(payload['portfolio'], list):
                    write_json_file(PORTFOLIO_FILE, payload['portfolio'])
                res = json.dumps({'success': True, 'count': len(payload.get('gallery', [])) if isinstance(payload, dict) else 0}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return
            except Exception as e:
                self.send_response(400)
                self._set_cors_headers()
                self.end_headers()
                return

        # Gallery Add / Update
        if req_path == '/api/gallery' or req_path == '/api/gallery/featured':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                items = read_gallery()

                if isinstance(payload, list):
                    items = payload
                elif isinstance(payload, dict) and 'id' in payload:
                    idx = next((i for i, it in enumerate(items) if it.get('id') == payload['id']), None)
                    if idx is not None:
                        items[idx] = {**items[idx], **payload}
                    else:
                        items.insert(0, payload)

                write_gallery(items)
                res = json.dumps({'success': True, 'count': len(items)}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return
            except Exception as e:
                self.send_response(400)
                self._set_cors_headers()
                self.end_headers()
                return

        # Portfolio Add / Update
        if req_path == '/api/portfolio':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                items = read_portfolio()

                if isinstance(payload, list):
                    items = payload
                elif isinstance(payload, dict) and 'id' in payload:
                    idx = next((i for i, it in enumerate(items) if it.get('id') == payload['id']), None)
                    if idx is not None:
                        items[idx] = {**items[idx], **payload}
                    else:
                        items.insert(0, payload)

                write_portfolio(items)
                res = json.dumps({'success': True, 'count': len(items)}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return
            except Exception as e:
                self.send_response(400)
                self._set_cors_headers()
                self.end_headers()
                return

        if req_path == '/api/cloud-sync':
            import urllib.request, urllib.parse
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            bin_id = params.get('bin', [None])[0]
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            if bin_id:
                try:
                    req = urllib.request.Request(
                        f'https://extendsclass.com/api/json-storage/bin/{bin_id}',
                        data=body,
                        headers={'Content-Type': 'application/json'},
                        method='PUT'
                    )
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        res = json.dumps({'success': True, 'bin': bin_id}).encode('utf-8')
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self._set_cors_headers()
                        self.end_headers()
                        self.wfile.write(res)
                        return
                except Exception as e:
                    err = json.dumps({'error': str(e)}).encode('utf-8')
                    self.send_response(502)
                    self.send_header('Content-Type', 'application/json')
                    self._set_cors_headers()
                    self.end_headers()
                    self.wfile.write(err)
                    return

        self.send_response(404)
        self._set_cors_headers()
        self.end_headers()

    def do_PUT(self):
        req_path = self.path.split('?')[0].split('#')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            patch_data = json.loads(body)

            if req_path.startswith('/api/bookings'):
                parts = req_path.strip('/').split('/')
                booking_id = parts[-1] if len(parts) >= 3 else patch_data.get('id')
                bookings = read_bookings()
                for b in bookings:
                    if b.get('id') == booking_id:
                        b.update(patch_data)
                write_bookings(bookings)
                res = json.dumps({'success': True, 'id': booking_id, 'status': 'updated'}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

            if req_path.startswith('/api/gallery'):
                items = read_gallery()
                if isinstance(patch_data, list):
                    items = patch_data
                elif 'id' in patch_data:
                    for it in items:
                        if it.get('id') == patch_data['id']:
                            it.update(patch_data)
                write_gallery(items)
                res = json.dumps({'success': True}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

            if req_path.startswith('/api/portfolio'):
                items = read_portfolio()
                if isinstance(patch_data, list):
                    items = patch_data
                elif 'id' in patch_data:
                    for it in items:
                        if it.get('id') == patch_data['id']:
                            it.update(patch_data)
                write_portfolio(items)
                res = json.dumps({'success': True}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

        except Exception as e:
            self.send_response(400)
            self._set_cors_headers()
            self.end_headers()

    def do_DELETE(self):
        req_path = self.path.split('?')[0].split('#')[0]

        if req_path.startswith('/api/bookings'):
            parts = req_path.strip('/').split('/')
            booking_id = parts[-1] if len(parts) >= 3 else None
            if booking_id:
                bookings = read_bookings()
                bookings = [b for b in bookings if b.get('id') != booking_id]
                write_bookings(bookings)
                res = json.dumps({'success': True, 'id': booking_id, 'status': 'deleted'}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

        if req_path.startswith('/api/gallery'):
            parts = req_path.strip('/').split('/')
            target_id = int(parts[-1]) if len(parts) >= 3 and parts[-1].isdigit() else None
            if target_id is not None:
                items = read_gallery()
                items = [it for it in items if it.get('id') != target_id]
                write_gallery(items)
                res = json.dumps({'success': True, 'deletedId': target_id}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(res)
                return

        if req_path.startswith('/api/portfolio'):
            parts = req_path.strip('/').split('/')
            target_id = parts[-1] if len(parts) >= 3 else None
            if target_id:
                items = read_portfolio()
                items = [it for it in items if it.get('id') != target_id]
                write_portfolio(items)
                res = json.dumps({'success': True, 'deletedId': target_id}).encode('utf-8')
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
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Paul Photography server running at http://0.0.0.0:{PORT}")
        print(f"Accessible via all network IPs and localhost:{PORT}")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

import os
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image
import imagehash

from database import init_db, get_db

app = Flask(__name__)
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"])

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'vigilant-secret-key-2024')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

# Initialize DB and seed admin user
init_db()
with app.app_context():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username='admin'")
    if not c.fetchone():
        c.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                  ('admin', generate_password_hash('password')))
        conn.commit()
    conn.close()

# ─── Auth ──────────────────────────────────────────────────────────────────────

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.split(' ')[1] if auth_header.startswith('Bearer ') else auth_header
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['username']
        except Exception:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '')
    password = data.get('password', '')
    if not username or not password:
        return jsonify({'error': 'Missing credentials'}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        token = jwt.encode({
            'username': user['username'],
            'exp': datetime.now(timezone.utc) + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'token': token, 'username': username})

    return jsonify({'error': 'Invalid username or password'}), 401


# ─── Assets ────────────────────────────────────────────────────────────────────

@app.route('/api/register', methods=['POST'])
@token_required
def register_asset(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    team = request.form.get('team', 'Unknown')
    event_name = request.form.get('event_name', 'Unknown')

    try:
        image_bytes = file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        phash = str(imagehash.phash(img))

        # Lazy-import heavy ML only when needed
        from ml_utils import get_clip_embedding
        embedding_json = json.dumps(get_clip_embedding(img))

        asset_id = str(uuid.uuid4())
        registered_at = datetime.now(timezone.utc).isoformat()

        conn = get_db()
        conn.execute(
            "INSERT INTO assets (asset_id, team, event_name, phash, clip_embedding, registered_at) VALUES (?,?,?,?,?,?)",
            (asset_id, team, event_name, phash, embedding_json, registered_at)
        )
        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Asset registered successfully',
            'asset': {
                'asset_id': asset_id,
                'team': team,
                'event_name': event_name,
                'phash': phash,
                'registered_at': registered_at
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/assets', methods=['GET'])
@token_required
def list_assets(current_user):
    try:
        conn = get_db()
        rows = conn.execute(
            "SELECT asset_id, team, event_name, phash, registered_at FROM assets ORDER BY registered_at DESC"
        ).fetchall()
        conn.close()
        return jsonify({'assets': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Scan ──────────────────────────────────────────────────────────────────────

@app.route('/api/scan', methods=['POST'])
@token_required
def scan_image(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    image_bytes = file.read()

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        query_phash = imagehash.phash(img)

        from ml_utils import get_clip_embedding, compute_similarity
        query_embedding = get_clip_embedding(img)

        conn = get_db()
        assets = conn.execute("SELECT * FROM assets").fetchall()

        matches = []
        best_asset_id = None
        highest_sim = 0.0

        for asset in assets:
            asset_phash = imagehash.hex_to_hash(asset['phash'])
            phash_diff = query_phash - asset_phash
            asset_embedding = json.loads(asset['clip_embedding'])
            clip_sim = compute_similarity(query_embedding, asset_embedding)

            if clip_sim > 0.85 or phash_diff < 10:
                matches.append({
                    'asset_id': asset['asset_id'],
                    'team': asset['team'],
                    'event_name': asset['event_name'],
                    'clip_similarity': float(clip_sim),
                    'phash_difference': int(phash_diff)
                })
                if clip_sim > highest_sim:
                    highest_sim = clip_sim
                    best_asset_id = asset['asset_id']

        vision_urls = []
        if best_asset_id:
            from ml_utils import get_google_vision_urls
            vision_urls = get_google_vision_urls(image_bytes)
            if vision_urls:
                detected_at = datetime.now(timezone.utc).isoformat()
                for v in vision_urls:
                    conn.execute(
                        "INSERT INTO violations (asset_id, source_url, confidence_score, detected_at, status) VALUES (?,?,?,?,?)",
                        (best_asset_id, v['url'], v['score'], detected_at, 'open')
                    )
                conn.commit()

        conn.close()
        return jsonify({'matches': matches, 'violations_found': len(vision_urls), 'vision_urls': vision_urls}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Violations ────────────────────────────────────────────────────────────────

@app.route('/api/violations', methods=['GET'])
@token_required
def get_violations(current_user):
    try:
        conn = get_db()
        rows = conn.execute(
            "SELECT asset_id, source_url, confidence_score, detected_at, status FROM violations ORDER BY detected_at DESC"
        ).fetchall()
        conn.close()
        return jsonify({'violations': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/violations/<int:vid>/status', methods=['PATCH'])
@token_required
def update_violation_status(current_user, vid):
    data = request.get_json(silent=True) or {}
    status = data.get('status', '').upper()
    if status not in ('OPEN', 'REVIEWING', 'RESOLVED'):
        return jsonify({'error': 'Invalid status. Use OPEN, REVIEWING, or RESOLVED'}), 400
    try:
        conn = get_db()
        conn.execute("UPDATE violations SET status=? WHERE id=?", (status.lower(), vid))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Status updated to {status}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5005)

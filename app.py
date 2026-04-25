import os
import io
import json
import uuid
import base64
import requests
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from PIL import Image
import imagehash

from database import init_db, get_db

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})

# Serve uploaded images
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('./uploads', filename)

API_KEY = os.getenv('GOOGLE_CLOUD_API_KEY')
UPLOAD_FOLDER = './uploads'

# Initialize DB
init_db()

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    # Hardcoded admin / password
    if username == 'admin' and password == 'password':
        return jsonify({
            "token": "mock-jwt-token",
            "user": {
                "name": "Admin User",
                "email": "admin@vigilant.io"
            }
        }), 200
    
    return jsonify({"error": "Invalid credentials"}), 401


# ── Assets ────────────────────────────────────────────────────────────────────

@app.route('/api/register', methods=['POST'])
def register_asset():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    team = request.form.get('team', 'Unknown')
    event_name = request.form.get('event_name', 'Unknown')

    asset_id = str(uuid.uuid4())
    filename = f"{asset_id}.jpg"
    image_path = os.path.join(UPLOAD_FOLDER, filename)

    try:
        # Save image
        img_data = file.read()
        img = Image.open(io.BytesIO(img_data)).convert('RGB')
        img.save(image_path)

        # Compute pHash
        phash = str(imagehash.average_hash(img))

        # Store in DB
        conn = get_db()
        conn.execute(
            "INSERT INTO assets (id, team, event_name, image_path, phash, registered_at) VALUES (?,?,?,?,?,?)",
            (asset_id, team, event_name, image_path, phash, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        conn.close()

        return jsonify({
            "asset_id": asset_id,
            "phash": phash,
            "message": "Asset registered"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/assets', methods=['GET'])
def get_assets():
    conn = get_db()
    rows = conn.execute("SELECT * FROM assets ORDER BY registered_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ── Scan ──────────────────────────────────────────────────────────────────────

@app.route('/api/scan', methods=['POST'])
def scan_asset():
    data = request.get_json() or {}
    asset_id = data.get('asset_id')
    
    if not asset_id:
        return jsonify({"error": "asset_id required"}), 400

    conn = get_db()
    asset = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    if not asset:
        conn.close()
        return jsonify({"error": "Asset not found"}), 404

    # Load original asset image for pHash
    asset_image_path = asset['image_path']
    asset_phash_str = asset['phash']
    asset_phash = imagehash.hex_to_hash(asset_phash_str)

    try:
        with open(asset_image_path, "rb") as f:
            base64_image = base64.b64encode(f.read()).decode('utf-8')

        # Google Vision REST API Call
        vision_url = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"
        payload = {
            "requests": [{
                "image": {"content": base64_image},
                "features": [{"type": "WEB_DETECTION"}]
            }]
        }

        response = requests.post(vision_url, json=payload)
        res_data = response.json()
        
        web_detection = res_data['responses'][0].get('webDetection', {})
        
        # Combine all match sources
        urls = []
        for key in ['fullMatchingImages', 'partialMatchingImages', 'visuallySimilarImages']:
            urls.extend([img.get('url') for img in web_detection.get(key, [])])
        
        # Unique URLs, max 15
        urls = list(set(filter(None, urls)))[:15]
        
        violations_found = []
        detected_at = datetime.now(timezone.utc).isoformat()

        for url in urls:
            confidence = 0.70  # Default fallback
            
            try:
                # Attempt to download image (max 2MB, 5s timeout)
                r = requests.get(url, timeout=5, stream=True)
                if r.status_code == 200:
                    content_length = r.headers.get('Content-Length')
                    if not content_length or int(content_length) < 2 * 1024 * 1024:
                        v_img_data = r.content
                        v_img = Image.open(io.BytesIO(v_img_data)).convert('RGB')
                        v_phash = imagehash.average_hash(v_img)
                        
                        # Hamming Distance Comparison
                        distance = asset_phash - v_phash
                        confidence = max(0.0, 1.0 - (distance / 64.0))
            except:
                pass # Use default confidence

            if confidence > 0.60:
                # Extract platform from domain
                domain = url.split('//')[-1].split('/')[0].lower()
                platform = "Web"
                if "twitter.com" in domain: platform = "Twitter"
                elif "instagram.com" in domain: platform = "Instagram"
                elif "reddit.com" in domain: platform = "Reddit"
                elif "facebook.com" in domain: platform = "Facebook"
                
                v_id = str(uuid.uuid4())
                violation = {
                    "id": v_id,
                    "asset_id": asset_id,
                    "source_url": url,
                    "platform": platform,
                    "confidence": round(float(confidence), 2),
                    "thumbnail_url": url, # Using source URL as thumb for demo
                    "detected_at": detected_at,
                    "status": "OPEN"
                }
                
                conn.execute("""
                    INSERT INTO violations (id, asset_id, source_url, platform, confidence, thumbnail_url, detected_at, status)
                    VALUES (?,?,?,?,?,?,?,?)
                """, (v_id, asset_id, url, platform, confidence, url, detected_at, 'OPEN'))
                violations_found.append(violation)

        conn.commit()
        conn.close()
        return jsonify(violations_found)

    except Exception as e:
        if conn: conn.close()
        return jsonify({"error": str(e)}), 500


# ── Violations ────────────────────────────────────────────────────────────────

@app.route('/api/violations', methods=['GET'])
def get_violations():
    asset_id = request.args.get('asset_id')
    conn = get_db()
    if asset_id:
        rows = conn.execute("SELECT * FROM violations WHERE asset_id = ? ORDER BY detected_at DESC", (asset_id,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM violations ORDER BY detected_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/violations/<id>/status', methods=['PATCH'])
def update_violation_status(id):
    data = request.get_json() or {}
    status = data.get('status')
    if status not in ['OPEN', 'REVIEWING', 'RESOLVED']:
        return jsonify({"error": "Invalid status"}), 400
    
    conn = get_db()
    conn.execute("UPDATE violations SET status = ? WHERE id = ?", (status, id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Violation status updated"})


if __name__ == '__main__':
    app.run(debug=True, port=5005)

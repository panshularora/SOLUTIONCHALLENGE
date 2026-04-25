# Vigilant — Digital Asset Protection Platform

A sports digital asset protection system that detects and tracks image violations across the web using AI-powered fingerprinting.

## Architecture

```
├── app.py              # Flask REST API (JWT auth, asset CRUD, scan, violations)
├── database.py         # SQLite schema (assets, violations, users)
├── fingerprint.py      # pHash + CLIP embedding module (ImageFingerprinter class)
├── ml_utils.py         # CLIP helpers, similarity computation, Google Vision integration
├── web_detector.py     # Web detection module (rate-limited URL scanning + pHash comparison)
├── anomaly_detector.py # Propagation spike & repeat offender detection (<100ms)
├── requirements.txt    # Python dependencies
└── frontend/           # React + Vite + Tailwind CSS v4 dashboard
    └── src/App.jsx     # Login screen + Violations dashboard
```

## Backend — Flask API

### Setup
```bash
pip install -r requirements.txt
python app.py         # starts on http://localhost:5005
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | No | Get JWT token |
| POST | `/api/register` | JWT | Register image asset (pHash + CLIP) |
| POST | `/api/scan` | JWT | Scan image for violations |
| GET  | `/api/assets` | JWT | List all registered assets |
| GET  | `/api/violations` | JWT | List all violations |
| PATCH | `/api/violations/<id>/status` | JWT | Update violation status |

**Default credentials:** `admin` / `password`

### Google Vision API
Set your credentials before running:
```bash
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\service-account.json"
```

## Frontend — React Dashboard

```bash
cd frontend
npm install
npm run dev    # starts on http://localhost:5173
```

Features:
- Login screen with real JWT authentication
- 4 metric cards (Total Assets, Violations Found, Avg Confidence, Assets at Risk)
- Violations table with asset thumbnail, source URL, platform badge, confidence bar, status pill, detected time
- Status badges: `OPEN` (red), `REVIEWING` (amber), `RESOLVED` (green)

## Key Modules

### `fingerprint.py` — ImageFingerprinter
Combined similarity = **70% CLIP cosine similarity + 30% normalized pHash hamming distance**  
Threshold: `combined_score > 0.82` → flagged as violation

### `web_detector.py` — WebDetector  
- Calls Google Vision `webDetection` API
- Downloads images (max 2MB, 5s timeout)
- Rate-limited to 5 requests/second
- Never crashes — returns `[]` on any failure

### `anomaly_detector.py` — detect_anomalies()
- **HIGH alert**: same asset on 5+ new domains within 60 minutes
- **MEDIUM alert**: same domain hosting 3+ different assets
- O(N) single-pass performance, designed for < 100ms execution

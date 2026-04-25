import sqlite3
import os

DB_NAME = 'vigilant.db'

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Table for registered assets
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            team TEXT,
            event_name TEXT,
            image_path TEXT,
            phash TEXT,
            registered_at TEXT
        )
    ''')
    
    # Table for detected violations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS violations (
            id TEXT PRIMARY KEY,
            asset_id TEXT,
            source_url TEXT,
            platform TEXT,
            confidence REAL,
            thumbnail_url TEXT,
            detected_at TEXT,
            status TEXT DEFAULT 'OPEN',
            FOREIGN KEY(asset_id) REFERENCES assets(id)
        )
    ''')
    
    conn.commit()
    conn.close()
    
    # Create uploads directory
    if not os.path.exists('./uploads'):
        os.makedirs('./uploads')

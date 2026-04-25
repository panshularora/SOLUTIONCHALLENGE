import uuid
import json
import random
from datetime import datetime, timedelta, timezone
from database import init_db, get_db

def seed_database():
    init_db()
    conn = get_db()
    c = conn.cursor()

    print("Cleaning old demo data...")
    c.execute("DELETE FROM violations")
    c.execute("DELETE FROM assets")

    # 1. Seed Assets
    assets_data = [
        ("Golden State Warriors - Championship Logo", "Warriors", "NBA Finals 2024"),
        ("Real Madrid CF - Official Kit Reveal", "Real Madrid", "La Liga Season Launch"),
        ("Formula 1 - Oracle Red Bull Racing Car", "Red Bull Racing", "Monaco Grand Prix"),
    ]

    asset_ids = []
    now = datetime.now(timezone.utc)

    for name, team, event in assets_data:
        aid = str(uuid.uuid4())
        asset_ids.append(aid)
        
        # Placeholder fingerprints
        phash = f"{random.getrandbits(64):016x}"
        clip_emb = [random.uniform(-1, 1) for _ in range(10)] # Small dummy embedding
        
        c.execute("""
            INSERT INTO assets (asset_id, team, event_name, phash, clip_embedding, registered_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (aid, team, event, phash, json.dumps(clip_emb), (now - timedelta(days=5)).isoformat()))

    # 2. Seed Violations (8 records)
    violation_scenarios = [
        ("twitter.com/sports_leaks/status/129384", "twitter.com"),
        ("instagram.com/p/C8k2m1sPj9/", "instagram.com"),
        ("reddit.com/r/nba/comments/v1a9s/", "reddit.com"),
        ("daily-sports-news.co.uk/exclusive-leak", "news-site"),
        ("facebook.com/groups/warriors-fans/posts/1", "facebook.com"),
        ("tiktok.com/@user99/video/738291", "tiktok.com"),
        ("telegram.me/betting_tips_global", "telegram.org"),
        ("discord.gg/invite/leak-central", "discord.com"),
    ]

    statuses = ['open', 'reviewing', 'resolved']
    
    for i in range(8):
        aid = random.choice(asset_ids)
        url_base, platform = violation_scenarios[i]
        url = f"https://{url_base}"
        conf = round(random.uniform(0.72, 0.97), 2)
        status = random.choice(statuses)
        # Random time within last 48 hours
        detected_at = (now - timedelta(hours=random.randint(1, 48))).isoformat()
        
        c.execute("""
            INSERT INTO violations (asset_id, source_url, confidence_score, detected_at, status)
            VALUES (?, ?, ?, ?, ?)
        """, (aid, url, conf, detected_at, status))

    conn.commit()
    conn.close()
    print("Database seeded successfully with 3 assets and 8 violations.")

if __name__ == '__main__':
    seed_database()

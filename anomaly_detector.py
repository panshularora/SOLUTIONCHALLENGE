import datetime
from collections import defaultdict

def detect_anomalies(records):
    """
    Analyzes violation records to detect propagation spikes and repeat offender domains.
    Designed for high-performance execution (< 100ms for typical datasets).
    
    Expected input format:
    [{'asset_id': '...', 'detected_at': '2023-10-12T15:00:00Z', 'domain': '...'}, ...]
    """
    if not records:
        return {"alert_level": "LOW", "reason": "No records to analyze.", "affected_assets": []}
        
    # Dictionary to track the EARLIEST time an asset was seen on a specific domain
    asset_domain_first_seen = {} 
    
    # Dictionary to track unique assets hosted per domain (for all time)
    domain_assets = defaultdict(set)
    
    max_time = None
    
    # 1. Single efficient pass to build core data structures
    for r in records:
        dt = r.get('detected_at')
        if isinstance(dt, str):
            # Fast parsing using built-in fromisoformat
            if dt.endswith('Z'):
                dt = datetime.datetime.fromisoformat(dt[:-1]).replace(tzinfo=datetime.timezone.utc)
            else:
                dt = datetime.datetime.fromisoformat(dt)
        
        # Track the "current" context time (latest record time)
        if max_time is None or dt > max_time:
            max_time = dt
            
        key = (r['asset_id'], r['domain'])
        
        # Log the *first* time this asset appeared on this specific domain
        if key not in asset_domain_first_seen or dt < asset_domain_first_seen[key]:
            asset_domain_first_seen[key] = dt
            
        # Track all unique assets for a given domain
        domain_assets[r['domain']].add(r['asset_id'])
        
    # Define our 60-minute lookback window from the most recent event
    cutoff_time = max_time - datetime.timedelta(minutes=60)
    
    # 2. Rule 1: Propagation Spikes (5+ new domains in last 60 minutes)
    asset_new_domains_count = defaultdict(int)
    for (asset_id, domain), first_seen in asset_domain_first_seen.items():
        if first_seen >= cutoff_time:
            asset_new_domains_count[asset_id] += 1
            
    high_alert_assets = [asset for asset, count in asset_new_domains_count.items() if count >= 5]
    
    # 3. Rule 2: Repeat Offenders (Domain hosts 3+ different assets)
    flagged_domains = [domain for domain, assets in domain_assets.items() if len(assets) >= 3]
    
    # 4. Determine final alert level and bundle response
    if high_alert_assets:
        reason = f"Propagation Spike Detected: {len(high_alert_assets)} asset(s) appeared on 5+ new domains within 60 minutes."
        if flagged_domains:
            reason += f" Additionally, {len(flagged_domains)} repeat offender domain(s) were found."
            
        return {
            "alert_level": "HIGH",
            "reason": reason,
            "affected_assets": high_alert_assets
        }
        
    elif flagged_domains:
        # For a medium alert regarding domains, we return all assets affected by these bad actors
        affected_assets = set()
        for d in flagged_domains:
            affected_assets.update(domain_assets[d])
            
        return {
            "alert_level": "MEDIUM",
            "reason": f"Repeat Offenders Detected: {len(flagged_domains)} domain(s) are hosting 3+ different assets.",
            "affected_assets": list(affected_assets)
        }
        
    else:
        return {
            "alert_level": "LOW",
            "reason": "Normal activity levels. No spikes or repeat offenders detected.",
            "affected_assets": []
        }

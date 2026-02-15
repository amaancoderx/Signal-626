"""
Geocode NUFORC sighting locations → Add latitude/longitude to Supabase
===========================================================================

This script:
1. Adds latitude/longitude columns to the Supabase table (if not exists)
2. Finds all unique locations without coordinates
3. Geocodes them using geopy (Nominatim - free, no API key)
4. Updates records in Supabase in bulk

Usage:
    pip install geopy supabase python-dotenv
    python geocode_locations.py

Note: Nominatim has rate limits (1 req/sec). For 150k records with ~15k unique
locations, this will take ~4-5 hours. Use --batch-size and --start-from to resume.
"""

import os
import sys
import time
import json
import logging
from typing import Optional, Dict, Tuple
from collections import defaultdict

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Cache file for geocoded locations (resume support)
CACHE_FILE = os.path.join(os.path.dirname(__file__), 'geocode_cache.json')


def load_cache() -> Dict[str, Tuple[float, float]]:
    """Load cached geocoding results."""
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r') as f:
            data = json.load(f)
            return {k: tuple(v) for k, v in data.items()}
    return {}


def save_cache(cache: Dict[str, Tuple[float, float]]):
    """Save geocoding cache."""
    with open(CACHE_FILE, 'w') as f:
        json.dump({k: list(v) for k, v in cache.items()}, f)


def geocode_location(location: str, geocoder) -> Optional[Tuple[float, float]]:
    """Geocode a single location string."""
    try:
        result = geocoder.geocode(location, timeout=10)
        if result:
            return (result.latitude, result.longitude)
    except Exception as e:
        logger.warning(f"Geocode error for '{location}': {e}")
    return None


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Geocode NUFORC locations')
    parser.add_argument('--batch-size', type=int, default=500, help='Update batch size')
    parser.add_argument('--start-from', type=int, default=0, help='Start from Nth unique location')
    parser.add_argument('--dry-run', action='store_true', help='Only count, do not geocode')

    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Signal 626 - Location Geocoder")
    logger.info("=" * 60)

    # Connect to Supabase
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Connected to Supabase")

    # Step 1: Get all unique locations that need geocoding
    logger.info("Fetching locations without coordinates...")

    locations_map = defaultdict(list)  # location -> [list of IDs]
    offset = 0
    batch = 10000

    while True:
        response = client.table('nuforc_sightings').select(
            'id, location'
        ).is_('latitude', 'null').not_.is_('location', 'null').range(
            offset, offset + batch - 1
        ).execute()

        if not response.data:
            break

        for row in response.data:
            if row['location']:
                locations_map[row['location']].append(row['id'])

        offset += batch
        logger.info(f"  Fetched {offset} records...")

        if len(response.data) < batch:
            break

    unique_locations = list(locations_map.keys())
    total_records = sum(len(ids) for ids in locations_map.values())

    logger.info(f"Found {len(unique_locations)} unique locations covering {total_records} records")

    if args.dry_run:
        logger.info("Dry run complete. Exiting.")
        return

    # Step 2: Geocode
    try:
        from geopy.geocoders import Nominatim
    except ImportError:
        logger.error("Please install geopy: pip install geopy")
        sys.exit(1)

    geocoder = Nominatim(user_agent="signal626_geocoder/1.0")
    cache = load_cache()
    logger.info(f"Loaded {len(cache)} cached locations")

    geocoded = 0
    failed = 0
    skipped = 0

    for i, location in enumerate(unique_locations[args.start_from:], start=args.start_from):
        if location in cache:
            lat, lng = cache[location]
            skipped += 1
        else:
            coords = geocode_location(location, geocoder)
            if coords:
                lat, lng = coords
                cache[location] = coords
                geocoded += 1
            else:
                failed += 1
                if (i + 1) % 100 == 0:
                    logger.info(f"Progress: {i+1}/{len(unique_locations)} | Geocoded: {geocoded} | Failed: {failed} | Cached: {skipped}")
                time.sleep(1)  # Rate limit
                continue

            # Rate limit for Nominatim
            time.sleep(1.1)

        # Update all records with this location
        ids = locations_map[location]
        for batch_start in range(0, len(ids), args.batch_size):
            batch_ids = ids[batch_start:batch_start + args.batch_size]
            try:
                client.table('nuforc_sightings').update({
                    'latitude': lat,
                    'longitude': lng
                }).in_('id', batch_ids).execute()
            except Exception as e:
                logger.error(f"Update error for {location}: {e}")

        if (i + 1) % 50 == 0:
            save_cache(cache)
            logger.info(f"Progress: {i+1}/{len(unique_locations)} | Geocoded: {geocoded} | Failed: {failed} | Cached: {skipped}")

    # Final save
    save_cache(cache)

    logger.info("=" * 60)
    logger.info(f"COMPLETE!")
    logger.info(f"  Geocoded: {geocoded}")
    logger.info(f"  From cache: {skipped}")
    logger.info(f"  Failed: {failed}")
    logger.info("=" * 60)


if __name__ == '__main__':
    main()

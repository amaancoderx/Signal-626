"""
NUFORC Firecrawl Scraper v2 - Correct Column Mapping
=====================================================
Extracts all 18 Supabase columns correctly.
"""

import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from firecrawl import Firecrawl
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")

BASE_URL = "https://nuforc.org"
PROGRESS_FILE = Path(__file__).parent / "firecrawl_v2_progress.json"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


def parse_datetime(raw: str) -> Optional[str]:
    """Parse datetime string to ISO format"""
    if not raw:
        return None
    raw = str(raw).strip()
    # Remove timezone indicators
    raw = re.sub(r'\s+(Local|Pacific|Eastern|Central|Mountain|UTC|GMT|Approximate).*$', '', raw, flags=re.IGNORECASE)

    patterns = [
        (r'(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?', 'ymd_hms'),
        (r'(\d{4})-(\d{2})-(\d{2})', 'ymd'),
        (r'(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})', 'mdy_hm'),
        (r'(\d{1,2})/(\d{1,2})/(\d{4})', 'mdy'),
    ]

    for pattern, fmt in patterns:
        match = re.search(pattern, raw)
        if match:
            try:
                g = match.groups()
                if fmt == 'ymd_hms':
                    return datetime(int(g[0]), int(g[1]), int(g[2]), int(g[3]), int(g[4]), int(g[5] or 0)).isoformat()
                elif fmt == 'ymd':
                    return datetime(int(g[0]), int(g[1]), int(g[2])).isoformat()
                elif fmt == 'mdy_hm':
                    return datetime(int(g[2]), int(g[0]), int(g[1]), int(g[3]), int(g[4])).isoformat()
                elif fmt == 'mdy':
                    return datetime(int(g[2]), int(g[0]), int(g[1])).isoformat()
            except:
                continue
    return None


def extract_field(text: str, label: str) -> Optional[str]:
    """Extract a single field value from markdown text"""
    # Firecrawl format: **Label:** Value (value on same line, not bold)
    patterns = [
        rf'\*\*{label}:\*\*\s*([^\n]+)',           # **Label:** Value
        rf'\*\*{label}\*\*:\s*([^\n]+)',           # **Label**: Value
        rf'{label}:\s*([^\n]+)',                    # Label: Value
    ]

    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            value = m.group(1).strip()
            # Clean up value
            value = re.sub(r'\*+', '', value)  # Remove any bold markers
            value = re.sub(r'\s+', ' ', value).strip()
            # Filter empty/null values
            if value and value.lower() not in ['', 'n/a', 'null', 'none', 'unknown', '-']:
                return value[:500]
    return None


def parse_markdown(sighting_id: int, markdown: str) -> Optional[dict]:
    """Parse Firecrawl markdown output into Supabase record with all 18 columns"""
    if not markdown or len(markdown) < 100:
        return None

    lower = markdown.lower()
    # Check for WAF blocks
    if 'wordfence' in lower or 'access denied' in lower:
        return None
    if 'your access to this site has been limited' in lower:
        return None
    if 'blocked' in lower and 'security' in lower:
        return None

    # Verify this is a sighting page
    if not any(marker in markdown for marker in ['Occurred', 'Location', 'Shape', 'Duration']):
        return None

    # Extract all 18 fields
    occurred_raw = extract_field(markdown, 'Occurred')
    location_raw = extract_field(markdown, 'Location')
    shape_raw = extract_field(markdown, 'Shape')

    # Skip draft/placeholder entries (1970-01-01 default date, empty location/shape)
    if occurred_raw and '1970-01-01' in occurred_raw:
        return None  # Placeholder entry
    if not location_raw or location_raw == ', ,' or not shape_raw:
        return None  # Empty required fields

    record = {
        'id': sighting_id,
        'url': f"{BASE_URL}/sighting/?id={sighting_id}",
        'occurred': parse_datetime(occurred_raw),
        'reported': parse_datetime(extract_field(markdown, 'Reported')),
        'duration': extract_field(markdown, 'Duration'),
        'num_observers': extract_field(markdown, 'No of observers') or extract_field(markdown, 'Number of observers'),
        'location': location_raw,
        'location_details': extract_field(markdown, 'Location details'),
        'shape': shape_raw,
        'color': extract_field(markdown, 'Color') or extract_field(markdown, 'Colour'),
        'estimated_size': extract_field(markdown, 'Estimated Size'),
        'viewed_from': extract_field(markdown, 'Viewed From'),
        'direction_from_viewer': extract_field(markdown, 'Direction from Viewer'),
        'angle_of_elevation': extract_field(markdown, 'Angle of Elevation'),
        'closest_distance': extract_field(markdown, 'Closest Distance'),
        'estimated_speed': extract_field(markdown, 'Estimated Speed'),
        'characteristics': extract_field(markdown, 'Characteristics'),
        'summary': None,
    }

    # Extract summary - the description text after all fields, before _Posted
    # Try multiple patterns since some pages don't have Characteristics field
    summary_patterns = [
        r'\*\*Characteristics:\*\*[^\n]*\n\n(.+?)(?=_Posted|\[Scroll|$)',  # After Characteristics
        r'\*\*Estimated Speed:\*\*[^\n]*\n\n(.+?)(?=_Posted|\[Scroll|$)',  # After Estimated Speed
        r'\*\*Closest Distance:\*\*[^\n]*\n\n(.+?)(?=_Posted|\[Scroll|$)',  # After Closest Distance
        r'\*\*Direction from Viewer:\*\*[^\n]*\n\n(.+?)(?=_Posted|\[Scroll|$)',  # After Direction
        r'\*\*Viewed From:\*\*[^\n]*\n\n(.+?)(?=_Posted|\[Scroll|$)',  # After Viewed From
        r'\*\*Shape:\*\*[^\n]*\n\n(.+?)(?=_Posted|\[Scroll|$)',  # After Shape (fallback)
    ]

    for pattern in summary_patterns:
        summary_match = re.search(pattern, markdown, re.DOTALL | re.IGNORECASE)
        if summary_match:
            summary = summary_match.group(1).strip()
            # Clean up
            summary = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', summary)  # Remove markdown links
            summary = re.sub(r'\n+', ' ', summary)  # Replace newlines with spaces
            summary = re.sub(r'\s+', ' ', summary).strip()
            # Filter navigation text and very short text
            if len(summary) > 30 and 'scroll to' not in summary.lower() and 'skip to' not in summary.lower():
                record['summary'] = summary[:2000]
                break

    return record


class FirecrawlScraperV2:
    def __init__(self):
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.firecrawl = Firecrawl(api_key=FIRECRAWL_API_KEY)
        self.scraped_ids = set()
        self.failed_ids = set()
        self.load_progress()
        self.success = 0
        self.blocked = 0

    def load_progress(self):
        if PROGRESS_FILE.exists():
            try:
                data = json.loads(PROGRESS_FILE.read_text())
                self.scraped_ids = set(data.get('scraped_ids', []))
                self.failed_ids = set(data.get('failed_ids', []))
            except:
                pass

    def save_progress(self):
        PROGRESS_FILE.write_text(json.dumps({
            'scraped_ids': list(self.scraped_ids),
            'failed_ids': list(self.failed_ids)
        }))

    def get_missing_ids(self, start_id: int, end_id: int) -> list:
        """Get IDs not yet in database"""
        existing = set()
        result = self.client.table('nuforc_sightings').select('id').gte('id', start_id).lte('id', end_id).execute()
        for r in result.data:
            existing.add(r['id'])
        return [i for i in range(end_id, start_id - 1, -1)
                if i not in existing and i not in self.scraped_ids and i not in self.failed_ids]

    def save_record(self, record: dict) -> bool:
        """Save record to Supabase"""
        if not record or not record.get('id'):
            return False
        # Must have at least some useful data
        if not (record.get('location') or record.get('shape') or record.get('occurred')):
            return False
        try:
            self.client.table('nuforc_sightings').upsert(record, on_conflict='id').execute()
            self.scraped_ids.add(record['id'])
            return True
        except Exception as e:
            logger.error(f"Save error: {e}")
            return False

    def fetch_one(self, sighting_id: int) -> Optional[dict]:
        """Fetch and parse a single sighting"""
        url = f"{BASE_URL}/sighting/?id={sighting_id}"

        try:
            result = self.firecrawl.scrape(url)
            markdown = getattr(result, 'markdown', None)

            if markdown:
                if 'wordfence' in markdown.lower():
                    logger.warning(f"  BLOCKED by Wordfence")
                    self.blocked += 1
                    self.failed_ids.add(sighting_id)
                    return None

                record = parse_markdown(sighting_id, markdown)
                if record:
                    self.success += 1
                    return record
                else:
                    self.failed_ids.add(sighting_id)
                    return None
            else:
                self.failed_ids.add(sighting_id)
                return None

        except Exception as e:
            logger.warning(f"ID {sighting_id}: Error - {e}")
            self.failed_ids.add(sighting_id)
            return None

    def run(self, start_id: int, end_id: int, limit: int = 500):
        logger.info("=" * 60)
        logger.info("NUFORC FIRECRAWL SCRAPER v2 - Correct Column Mapping")
        logger.info(f"Range: {start_id} -> {end_id}")
        logger.info(f"Limit: {limit} pages")
        logger.info("=" * 60)

        ids = self.get_missing_ids(start_id, end_id)
        logger.info(f"Missing IDs to scrape: {len(ids)}")

        if limit:
            ids = ids[:limit]
            logger.info(f"Processing {len(ids)} IDs")

        if not ids:
            logger.info("All done!")
            return

        total_saved = 0
        start_time = time.time()

        try:
            for i, sid in enumerate(ids):
                logger.info(f"[{i+1}/{len(ids)}] ID {sid}...")

                record = self.fetch_one(sid)

                if record:
                    if self.save_record(record):
                        total_saved += 1
                        # Show extracted data
                        shape = record.get('shape') or '-'
                        location = record.get('location') or '-'
                        duration = record.get('duration') or '-'
                        logger.info(f"  OK: {shape} | {location} | {duration}")
                else:
                    logger.info(f"  SKIP (no data)")

                self.save_progress()

                # Check if blocked
                if self.blocked >= 10 and self.success == 0:
                    logger.error("Too many blocks - stopping")
                    break

                # Progress every 10 records
                if (i + 1) % 10 == 0:
                    elapsed = time.time() - start_time
                    rate = total_saved / elapsed * 60 if elapsed > 0 else 0
                    logger.info(f"--- Progress: {i+1}/{len(ids)} | Saved: {total_saved} | Rate: {rate:.1f}/min ---")

                time.sleep(1)

        except KeyboardInterrupt:
            logger.info("\nStopped by user")
        finally:
            self.save_progress()

        elapsed = time.time() - start_time
        logger.info(f"\n{'='*60}")
        logger.info(f"COMPLETE!")
        logger.info(f"Saved: {total_saved} | Blocked: {self.blocked}")
        logger.info(f"Time: {elapsed/60:.1f} minutes")
        logger.info(f"{'='*60}")


if __name__ == '__main__':
    scraper = FirecrawlScraperV2()
    scraper.run(179774, 195978, limit=500)

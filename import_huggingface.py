"""
Import NUFORC data from Hugging Face dataset (147,890 records!)
================================================================

Maps all fields to Supabase schema including:
- location, shape, duration, occurred, reported
- num_observers, characteristics, summary
"""

import json
import logging
import os
import re
from datetime import datetime
from typing import Optional

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


def parse_datetime(raw: str) -> Optional[str]:
    """Parse datetime from various formats."""
    if not raw or not isinstance(raw, str):
        return None

    raw = raw.strip()
    # Remove timezone suffixes
    raw = re.sub(r'\s+(Local|Pacific|Eastern|Central|Mountain|UTC|GMT).*$', '', raw, flags=re.IGNORECASE)
    raw = raw.strip()

    if not raw:
        return None

    # Try various formats
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.isoformat()
        except ValueError:
            continue

    return None


def clean_string(value, max_length: int = 500) -> Optional[str]:
    """Clean and truncate string value."""
    if not value:
        return None
    if not isinstance(value, str):
        value = str(value)
    value = value.strip()
    if value.lower() in ['', 'nan', 'none', 'null', 'n/a', 'unknown']:
        return None
    return value[:max_length] if len(value) > max_length else value


class HuggingFaceImporter:
    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase connected")

    def import_json(self, filepath: str, clear_first: bool = False) -> int:
        """Import JSON file to Supabase."""
        logger.info("=" * 60)
        logger.info("NUFORC Hugging Face Importer (147,890 records)")
        logger.info(f"File: {filepath}")
        logger.info("=" * 60)

        if clear_first:
            logger.warning("Clearing existing data...")
            try:
                self.client.table('nuforc_sightings').delete().gte('id', 0).execute()
            except Exception as e:
                logger.error(f"Error clearing: {e}")

        # Read JSON
        logger.info("Reading JSON file...")
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        logger.info(f"Total records in file: {len(data)}")

        # Process records
        records = []
        for i, row in enumerate(data):
            try:
                record = self._map_record(row)
                if record:
                    records.append(record)
            except Exception as e:
                continue

            if (i + 1) % 20000 == 0:
                logger.info(f"Processed {i + 1:,} rows...")

        logger.info(f"Valid records: {len(records):,}")

        # Save to Supabase
        return self._save_records(records)

    def _map_record(self, row: dict) -> Optional[dict]:
        """Map JSON record to Supabase schema."""

        # Get sighting ID
        sighting_id = row.get('Sighting')
        if not sighting_id:
            return None

        # Parse characteristics
        characteristics = row.get('Characteristics', [])
        if isinstance(characteristics, list):
            characteristics_str = ', '.join(characteristics) if characteristics else None
        else:
            characteristics_str = clean_string(characteristics)

        # Extract color from characteristics or text
        color = None
        text = row.get('Text', '') or ''
        summary = row.get('Summary', '') or ''

        # Try to extract color mentions
        color_patterns = [
            r'(?:color|colour|colored|coloured)\s+(?:was\s+)?(\w+)',
            r'(\w+)\s+(?:color|colour|colored|coloured)',
            r'(red|blue|green|white|yellow|orange|black|silver|gray|grey|purple|pink)\s+(?:light|glow|object)',
        ]
        for pattern in color_patterns:
            match = re.search(pattern, text + ' ' + summary, re.IGNORECASE)
            if match:
                color = match.group(1).capitalize()
                break

        # Build record
        record = {
            'id': int(sighting_id),
            'url': f"https://nuforc.org/sighting/?id={sighting_id}",
            'occurred': parse_datetime(row.get('Occurred')),
            'reported': parse_datetime(row.get('Reported')),
            'duration': clean_string(row.get('Duration')),
            'num_observers': clean_string(row.get('No of observers')),
            'location': clean_string(row.get('Location')),
            'location_details': None,  # Not in this dataset
            'shape': clean_string(row.get('Shape'), 100),
            'color': color,
            'estimated_size': None,  # Not in this dataset
            'viewed_from': None,
            'direction_from_viewer': None,
            'angle_of_elevation': None,
            'closest_distance': None,
            'estimated_speed': None,
            'characteristics': characteristics_str,
            'summary': clean_string(row.get('Text') or row.get('Summary'), 2000),
        }

        # Validate - must have at least one key field
        if not record['location'] and not record['shape'] and not record['occurred']:
            return None

        return record

    def _save_records(self, records: list, batch_size: int = 500) -> int:
        """Save records to Supabase in batches."""
        total = 0

        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]

            try:
                response = self.client.table('nuforc_sightings').upsert(
                    batch,
                    on_conflict='id'
                ).execute()

                if response.data:
                    total += len(response.data)
                    logger.info(f"Saved batch {i//batch_size + 1}: {len(response.data)} records (Total: {total:,})")

            except Exception as e:
                logger.error(f"Batch error: {e}")
                # Try individual inserts
                for record in batch:
                    try:
                        self.client.table('nuforc_sightings').upsert(
                            record,
                            on_conflict='id'
                        ).execute()
                        total += 1
                    except:
                        pass

        return total


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Import NUFORC from Hugging Face')
    parser.add_argument('--file', type=str, default='nuforc_hf.json', help='JSON file')
    parser.add_argument('--clear', action='store_true', help='Clear existing data')

    args = parser.parse_args()

    filepath = args.file
    if not os.path.isabs(filepath):
        filepath = os.path.join(os.path.dirname(__file__), filepath)

    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return

    importer = HuggingFaceImporter()
    saved = importer.import_json(filepath, clear_first=args.clear)

    logger.info("=" * 60)
    logger.info(f"COMPLETE! Imported {saved:,} records")
    logger.info("=" * 60)


if __name__ == '__main__':
    main()

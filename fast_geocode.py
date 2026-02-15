"""
Signal 626 - FAST Geocoder (US State Centroids + Known Cities)
================================================================

This uses built-in coordinate lookups for instant geocoding.
No API calls needed - processes 150k records in ~5 minutes.

Usage:
    pip install supabase python-dotenv
    python fast_geocode.py

Then run 'geocode_locations.py' later for precise coordinates.
"""

import os
import re
import json
import logging
import random
from typing import Optional, Tuple
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

# US State centroids (approximate center of each state)
US_STATES = {
    'AL': (32.806671, -86.791130), 'AK': (61.370716, -152.404419),
    'AZ': (33.729759, -111.431221), 'AR': (34.969704, -92.373123),
    'CA': (36.116203, -119.681564), 'CO': (39.059811, -105.311104),
    'CT': (41.597782, -72.755371), 'DE': (39.318523, -75.507141),
    'FL': (27.766279, -81.686783), 'GA': (33.040619, -83.643074),
    'HI': (21.094318, -157.498337), 'ID': (44.240459, -114.478828),
    'IL': (40.349457, -88.986137), 'IN': (39.849426, -86.258278),
    'IA': (42.011539, -93.210526), 'KS': (38.526600, -96.726486),
    'KY': (37.668140, -84.670067), 'LA': (31.169546, -91.867805),
    'ME': (44.693947, -69.381927), 'MD': (39.063946, -76.802101),
    'MA': (42.230171, -71.530106), 'MI': (43.326618, -84.536095),
    'MN': (45.694454, -93.900192), 'MS': (32.741646, -89.678696),
    'MO': (38.456085, -92.288368), 'MT': (46.921925, -110.454353),
    'NE': (41.125370, -98.268082), 'NV': (38.313515, -117.055374),
    'NH': (43.452492, -71.563896), 'NJ': (40.298904, -74.521011),
    'NM': (34.840515, -106.248482), 'NY': (42.165726, -74.948051),
    'NC': (35.630066, -79.806419), 'ND': (47.528912, -99.784012),
    'OH': (40.388783, -82.764915), 'OK': (35.565342, -96.928917),
    'OR': (44.572021, -122.070938), 'PA': (40.590752, -77.209755),
    'RI': (41.680893, -71.511780), 'SC': (33.856892, -80.945007),
    'SD': (44.299782, -99.438828), 'TN': (35.747845, -86.692345),
    'TX': (31.054487, -97.563461), 'UT': (40.150032, -111.862434),
    'VT': (44.045876, -72.710686), 'VA': (37.769337, -78.169968),
    'WA': (47.400902, -121.490494), 'WV': (38.491226, -80.954453),
    'WI': (44.268543, -89.616508), 'WY': (42.755966, -107.302490),
    'DC': (38.897438, -77.026817), 'PR': (18.220833, -66.590149),
    'VI': (18.335765, -64.896335), 'GU': (13.444304, 144.793731),
}

# Major US cities with precise coordinates
MAJOR_CITIES = {
    'New York': (40.7128, -74.0060), 'Los Angeles': (34.0522, -118.2437),
    'Chicago': (41.8781, -87.6298), 'Houston': (29.7604, -95.3698),
    'Phoenix': (33.4484, -112.0740), 'Philadelphia': (39.9526, -75.1652),
    'San Antonio': (29.4241, -98.4936), 'San Diego': (32.7157, -117.1611),
    'Dallas': (32.7767, -96.7970), 'San Jose': (37.3382, -121.8863),
    'Austin': (30.2672, -97.7431), 'Jacksonville': (30.3322, -81.6557),
    'Fort Worth': (32.7555, -97.3308), 'Columbus': (39.9612, -82.9988),
    'San Francisco': (37.7749, -122.4194), 'Charlotte': (35.2271, -80.8431),
    'Indianapolis': (39.7684, -86.1581), 'Seattle': (47.6062, -122.3321),
    'Denver': (39.7392, -104.9903), 'Washington': (38.9072, -77.0369),
    'Nashville': (36.1627, -86.7816), 'El Paso': (31.7619, -106.4850),
    'Boston': (42.3601, -71.0589), 'Portland': (45.5152, -122.6784),
    'Las Vegas': (36.1699, -115.1398), 'Memphis': (35.1495, -90.0490),
    'Louisville': (38.2527, -85.7585), 'Baltimore': (39.2904, -76.6122),
    'Milwaukee': (43.0389, -87.9065), 'Albuquerque': (35.0844, -106.6504),
    'Tucson': (32.2226, -110.9747), 'Fresno': (36.7378, -119.7871),
    'Sacramento': (38.5816, -121.4944), 'Mesa': (33.4152, -111.8315),
    'Kansas City': (39.0997, -94.5786), 'Atlanta': (33.7490, -84.3880),
    'Omaha': (41.2565, -95.9345), 'Colorado Springs': (38.8339, -104.8214),
    'Raleigh': (35.7796, -78.6382), 'Long Beach': (33.7701, -118.1937),
    'Virginia Beach': (36.8529, -75.9780), 'Miami': (25.7617, -80.1918),
    'Oakland': (37.8044, -122.2712), 'Minneapolis': (44.9778, -93.2650),
    'Tulsa': (36.1540, -95.9928), 'Tampa': (27.9506, -82.4572),
    'Arlington': (32.7357, -97.1081), 'New Orleans': (29.9511, -90.0715),
    'Cleveland': (41.4993, -81.6944), 'Honolulu': (21.3069, -157.8583),
    'Anaheim': (33.8366, -117.9143), 'Orlando': (28.5383, -81.3792),
    'St. Louis': (38.6270, -90.1994), 'Pittsburgh': (40.4406, -79.9959),
    'Cincinnati': (39.1031, -84.5120), 'Anchorage': (61.2181, -149.9003),
    'Detroit': (42.3314, -83.0458), 'Salt Lake City': (40.7608, -111.8910),
    'Tacoma': (47.2529, -122.4443), 'Spokane': (47.6588, -117.4260),
    'Boise': (43.6150, -116.2023), 'Reno': (39.5296, -119.8138),
    'Scottsdale': (33.4942, -111.9261), 'Chandler': (33.3062, -111.8413),
    'St. Petersburg': (27.7676, -82.6403), 'Norfolk': (36.8508, -76.2859),
    'Buffalo': (42.8864, -78.8784), 'Rochester': (43.1566, -77.6088),
    'Syracuse': (43.0481, -76.1474), 'Albany': (42.6526, -73.7562),
    'Dayton': (39.7589, -84.1916), 'Akron': (41.0814, -81.5190),
    'Madison': (43.0731, -89.4012), 'Lexington': (38.0406, -84.5037),
    'Knoxville': (35.9606, -83.9207), 'Chattanooga': (35.0456, -85.3097),
    'Springfield': (39.7817, -89.6501), 'Little Rock': (34.7465, -92.2896),
    'Baton Rouge': (30.4515, -91.1871), 'Mobile': (30.6954, -88.0399),
    'Birmingham': (33.5207, -86.8025), 'Des Moines': (41.5868, -93.6250),
    'Wichita': (37.6872, -97.3301), 'Columbia': (34.0007, -81.0348),
    'Charleston': (32.7765, -79.9311), 'Savannah': (32.0809, -81.0912),
    'Providence': (41.8240, -71.4128), 'Hartford': (41.7658, -72.6734),
    'Wilmington': (34.2257, -77.9447), 'Fargo': (46.8772, -96.7898),
    'Sioux Falls': (43.5446, -96.7311), 'Billings': (45.7833, -108.5007),
    'Cheyenne': (41.1400, -104.8202), 'Burlington': (44.4759, -73.2121),
    'Concord': (43.2081, -71.5376), 'Dover': (39.1582, -75.5244),
    'Annapolis': (38.9784, -76.4922), 'Juneau': (58.3005, -134.4197),
    'Helena': (46.5891, -112.0391), 'Pierre': (44.3683, -100.3510),
    'Bismarck': (46.8083, -100.7837), 'Santa Fe': (35.6870, -105.9378),
    'Carson City': (39.1638, -119.7674), 'Olympia': (47.0379, -122.9007),
    'Salem': (44.9429, -123.0351), 'Topeka': (39.0473, -95.6752),
    'Oklahoma City': (35.4676, -97.5164), 'Lincoln': (40.8136, -96.7026),
    'Jackson': (32.2988, -90.1848), 'Montgomery': (32.3792, -86.3077),
    'Tallahassee': (30.4383, -84.2807), 'Richmond': (37.5407, -77.4360),
    'Harrisburg': (40.2732, -76.8867), 'Trenton': (40.2171, -74.7429),
    'Lansing': (42.7325, -84.5555), 'Frankfort': (38.2009, -84.8733),
    'Jefferson City': (38.5768, -92.1735), 'Montpelier': (44.2601, -72.5754),
    'Augusta': (44.3106, -69.7795),
}

# International country centroids
COUNTRY_COORDS = {
    'USA': (39.8283, -98.5795), 'Canada': (56.1304, -106.3468),
    'UK': (55.3781, -3.4360), 'Australia': (-25.2744, 133.7751),
    'Germany': (51.1657, 10.4515), 'France': (46.2276, 2.2137),
    'India': (20.5937, 78.9629), 'Brazil': (-14.2350, -51.9253),
    'Mexico': (23.6345, -102.5528), 'Japan': (36.2048, 138.2529),
    'China': (35.8617, 104.1954), 'Russia': (61.5240, 105.3188),
    'Italy': (41.8719, 12.5674), 'Spain': (40.4637, -3.7492),
    'Netherlands': (52.1326, 5.2913), 'Sweden': (60.1282, 18.6435),
    'Norway': (60.4720, 8.4689), 'Denmark': (56.2639, 9.5018),
    'Finland': (61.9241, 25.7482), 'Poland': (51.9194, 19.1451),
    'Ireland': (53.1424, -7.6921), 'New Zealand': (-40.9006, 174.8860),
    'South Africa': (-30.5595, 22.9375), 'Argentina': (-38.4161, -63.6167),
    'Chile': (-35.6751, -71.5430), 'Colombia': (4.5709, -74.2973),
    'Turkey': (38.9637, 35.2433), 'Greece': (39.0742, 21.8243),
    'Portugal': (39.3999, -8.2245), 'Belgium': (50.8503, 4.3517),
    'Austria': (47.5162, 14.5501), 'Switzerland': (46.8182, 8.2275),
    'Philippines': (12.8797, 121.7740), 'Indonesia': (-0.7893, 113.9213),
    'Thailand': (15.8700, 100.9925), 'Singapore': (1.3521, 103.8198),
    'South Korea': (35.9078, 127.7669), 'Israel': (31.0461, 34.8516),
    'Egypt': (26.8206, 30.8025), 'Puerto Rico': (18.2208, -66.5901),
}

# Canadian province centroids
CA_PROVINCES = {
    'ON': (51.2538, -85.3232), 'QC': (52.9399, -73.5491),
    'BC': (53.7267, -127.6476), 'AB': (53.9333, -116.5765),
    'MB': (53.7609, -98.8139), 'SK': (52.9399, -106.4509),
    'NS': (44.6820, -63.7443), 'NB': (46.5653, -66.4619),
    'NL': (53.1355, -57.6604), 'PE': (46.5107, -63.4168),
    'NT': (64.8255, -124.8457), 'YT': (64.2823, -135.0000),
    'NU': (70.2998, -83.1076),
}


def parse_location(loc: str) -> Optional[Tuple[float, float]]:
    """Parse a location string and return (lat, lng) or None."""
    if not loc:
        return None

    loc = loc.strip()
    parts = [p.strip() for p in loc.split(',')]

    # Pattern: "City, ST, USA" or "City, ST, Country"
    if len(parts) >= 2:
        city = parts[0].strip()
        state = parts[1].strip()
        country = parts[2].strip() if len(parts) >= 3 else 'USA'

        # Check exact city match first
        if city in MAJOR_CITIES:
            lat, lng = MAJOR_CITIES[city]
            # Add small random offset to prevent all dots in same spot
            return (lat + random.uniform(-0.05, 0.05),
                    lng + random.uniform(-0.05, 0.05))

        # Check US state
        state_abbr = state.upper()
        if len(state_abbr) == 2 and state_abbr in US_STATES:
            lat, lng = US_STATES[state_abbr]
            # Add random offset within state to spread dots
            return (lat + random.uniform(-0.5, 0.5),
                    lng + random.uniform(-0.5, 0.5))

        # Check Canadian province
        if state_abbr in CA_PROVINCES:
            lat, lng = CA_PROVINCES[state_abbr]
            return (lat + random.uniform(-0.5, 0.5),
                    lng + random.uniform(-0.5, 0.5))

        # Check country
        for cname, coords in COUNTRY_COORDS.items():
            if cname.lower() in country.lower():
                lat, lng = coords
                return (lat + random.uniform(-1, 1),
                        lng + random.uniform(-1, 1))

    # Single part - might be a country or city name
    if len(parts) == 1:
        if parts[0] in MAJOR_CITIES:
            lat, lng = MAJOR_CITIES[parts[0]]
            return (lat + random.uniform(-0.05, 0.05),
                    lng + random.uniform(-0.05, 0.05))

        for cname, coords in COUNTRY_COORDS.items():
            if cname.lower() in parts[0].lower():
                lat, lng = coords
                return (lat + random.uniform(-1, 1),
                        lng + random.uniform(-1, 1))

    return None


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Fast geocode NUFORC locations')
    parser.add_argument('--batch-size', type=int, default=500, help='Update batch size')
    parser.add_argument('--dry-run', action='store_true', help='Count only, no updates')
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Signal 626 - FAST Location Geocoder")
    logger.info("Using built-in US/World coordinate lookup")
    logger.info("=" * 60)

    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Connected to Supabase")

    # Fetch all records missing coordinates
    logger.info("Fetching records without coordinates...")

    all_records = []
    offset = 0
    batch = 1000  # Supabase default max rows per request

    while True:
        response = client.table('nuforc_sightings').select(
            'id, location'
        ).is_('latitude', 'null').not_.is_('location', 'null').range(
            offset, offset + batch - 1
        ).execute()

        if not response.data:
            break

        all_records.extend(response.data)
        offset += batch
        logger.info(f"  Fetched {len(all_records)} records...")

        if len(response.data) < batch:
            break

    logger.info(f"Total records to geocode: {len(all_records)}")

    if args.dry_run:
        # Test geocoding accuracy
        found = 0
        for r in all_records:
            if parse_location(r['location']):
                found += 1
        logger.info(f"Would geocode: {found}/{len(all_records)} ({100*found/max(len(all_records),1):.1f}%)")
        return

    # Geocode and update in batches
    updates = []
    skipped = 0
    geocoded = 0

    for i, record in enumerate(all_records):
        coords = parse_location(record['location'])
        if coords:
            updates.append({
                'id': record['id'],
                'latitude': round(coords[0], 6),
                'longitude': round(coords[1], 6),
            })
            geocoded += 1
        else:
            skipped += 1

        # Batch update
        if len(updates) >= args.batch_size:
            try:
                client.table('nuforc_sightings').upsert(
                    updates, on_conflict='id'
                ).execute()
                logger.info(f"Updated batch: {geocoded} geocoded, {skipped} skipped "
                           f"({i+1}/{len(all_records)})")
            except Exception as e:
                logger.error(f"Batch update error: {e}")
            updates = []

    # Final batch
    if updates:
        try:
            client.table('nuforc_sightings').upsert(
                updates, on_conflict='id'
            ).execute()
        except Exception as e:
            logger.error(f"Final batch error: {e}")

    logger.info("=" * 60)
    logger.info(f"COMPLETE!")
    logger.info(f"  Geocoded: {geocoded}")
    logger.info(f"  Skipped: {skipped}")
    logger.info(f"  Coverage: {100*geocoded/max(len(all_records),1):.1f}%")
    logger.info("=" * 60)
    logger.info("")
    logger.info("For precise coordinates, run: python geocode_locations.py")


if __name__ == '__main__':
    main()

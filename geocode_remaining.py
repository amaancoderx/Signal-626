"""
Signal 626 - Geocode Remaining Records
=======================================
Handles edge cases the fast_geocode.py missed:
- UK/England locations
- US locations with parenthetical text
- Extended international country list
- City names with country in parentheses

Usage:
    python geocode_remaining.py
    python geocode_remaining.py --dry-run
"""

import os
import re
import json
import logging
import random
from typing import Optional, Tuple
from collections import Counter

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

# US State centroids
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

# Extended country list (covers all the remaining patterns)
COUNTRY_COORDS = {
    # Original
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
    # NEW - covers the remaining patterns
    'United Kingdom': (55.3781, -3.4360),
    'England': (52.3555, -1.1743),
    'Scotland': (56.4907, -4.2026),
    'Wales': (52.1307, -3.7837),
    'Northern Ireland': (54.7877, -6.4923),
    'Morocco': (31.7917, -7.0926),
    'Panama': (8.5380, -80.7821),
    'Bahamas': (25.0343, -77.3963),
    'Botswana': (-22.3285, 24.6849),
    'Pakistan': (30.3753, 69.3451),
    'Iran': (32.4279, 53.6880),
    'Iraq': (33.2232, 43.6793),
    'Bulgaria': (42.7339, 25.4858),
    'Syria': (34.8021, 38.9968),
    'Lebanon': (33.8547, 35.8623),
    'Malaysia': (4.2105, 101.9758),
    'Peru': ((-9.1900, -75.0152)),
    'Jordan': (30.5852, 36.2384),
    'Bermuda': (32.3078, -64.7505),
    'Cuba': (21.5218, -77.7812),
    'Jamaica': (18.1096, -77.2975),
    'Costa Rica': (9.7489, -83.7534),
    'Guatemala': (15.7835, -90.2308),
    'Honduras': (15.2000, -86.2419),
    'Nicaragua': (12.8654, -85.2072),
    'El Salvador': (13.7942, -88.8965),
    'Dominican Republic': (18.7357, -70.1627),
    'Trinidad': (10.6918, -61.2225),
    'Barbados': (13.1939, -59.5432),
    'Venezuela': (6.4238, -66.5897),
    'Ecuador': (-1.8312, -78.1834),
    'Bolivia': (-16.2902, -63.5887),
    'Paraguay': (-23.4425, -58.4438),
    'Uruguay': (-32.5228, -55.7658),
    'Croatia': (45.1000, 15.2000),
    'Czech Republic': (49.8175, 15.4730),
    'Czechia': (49.8175, 15.4730),
    'Romania': (45.9432, 24.9668),
    'Hungary': (47.1625, 19.5033),
    'Slovakia': (48.6690, 19.6990),
    'Serbia': (44.0165, 21.0059),
    'Slovenia': (46.1512, 14.9955),
    'Bosnia': (43.9159, 17.6791),
    'Montenegro': (42.7087, 19.3744),
    'Albania': (41.1533, 20.1683),
    'North Macedonia': (41.5122, 21.7453),
    'Macedonia': (41.5122, 21.7453),
    'Kosovo': (42.6026, 20.9030),
    'Lithuania': (55.1694, 23.8813),
    'Latvia': (56.8796, 24.6032),
    'Estonia': (58.5953, 25.0136),
    'Ukraine': (48.3794, 31.1656),
    'Belarus': (53.7098, 27.9534),
    'Moldova': (47.4116, 28.3699),
    'Iceland': (64.9631, -19.0208),
    'Cyprus': (35.1264, 33.4299),
    'Malta': (35.9375, 14.3754),
    'Luxembourg': (49.8153, 6.1296),
    'Taiwan': (23.6978, 120.9605),
    'Vietnam': (14.0583, 108.2772),
    'Cambodia': (12.5657, 104.9910),
    'Myanmar': (21.9162, 95.9560),
    'Bangladesh': (23.6850, 90.3563),
    'Sri Lanka': (7.8731, 80.7718),
    'Nepal': (28.3949, 84.1240),
    'Afghanistan': (33.9391, 67.7100),
    'Saudi Arabia': (23.8859, 45.0792),
    'UAE': (23.4241, 53.8478),
    'United Arab Emirates': (23.4241, 53.8478),
    'Qatar': (25.3548, 51.1839),
    'Kuwait': (29.3117, 47.4818),
    'Oman': (21.4735, 55.9754),
    'Bahrain': (26.0667, 50.5577),
    'Yemen': (15.5527, 48.5164),
    'Kenya': (-0.0236, 37.9062),
    'Nigeria': (9.0820, 8.6753),
    'Ghana': (7.9465, -1.0232),
    'Ethiopia': (9.1450, 40.4897),
    'Tanzania': (-6.3690, 34.8888),
    'Uganda': (1.3733, 32.2903),
    'Rwanda': (-1.9403, 29.8739),
    'Mozambique': (-18.6657, 35.5296),
    'Zimbabwe': (-19.0154, 29.1549),
    'Zambia': (-13.1339, 27.8493),
    'Namibia': (-22.9576, 18.4904),
    'Congo': (-4.0383, 21.7587),
    'Tunisia': (33.8869, 9.5375),
    'Algeria': (28.0339, 1.6596),
    'Libya': (26.3351, 17.2283),
    'Sudan': (12.8628, 30.2176),
    'Pacific Ocean': (0.0, -160.0),
    'Atlantic Ocean': (14.5994, -28.6731),
    'Caribbean': (14.5, -75.0),
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

# US state full names to abbreviations
STATE_NAMES = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
    'puerto rico': 'PR',
}

# International city coordinates for common ones in the data
INTL_CITIES = {
    'London': (51.5074, -0.1278),
    'Manchester': (53.4808, -2.2426),
    'Birmingham': (52.4862, -1.8904),
    'Leeds': (53.8008, -1.5491),
    'Glasgow': (55.8642, -4.2518),
    'Edinburgh': (55.9533, -3.1883),
    'Bristol': (51.4545, -2.5879),
    'Liverpool': (53.4084, -2.9916),
    'Sheffield': (53.3811, -1.4701),
    'Newcastle': (54.9783, -1.6178),
    'Nottingham': (52.9548, -1.1581),
    'Southampton': (50.9097, -1.4044),
    'Brighton': (50.8225, -0.1372),
    'Cardiff': (51.4816, -3.1791),
    'Belfast': (54.5973, -5.9301),
    'Aberdeen': (57.1497, -2.0943),
    'Dundee': (56.4620, -2.9707),
    'Oxford': (51.7520, -1.2577),
    'Cambridge': (52.2053, 0.1218),
    'York': (53.9600, -1.0873),
    'Bath': (51.3811, -2.3590),
    'Canterbury': (51.2802, 1.0789),
    'Exeter': (50.7184, -3.5339),
    'Plymouth': (50.3755, -4.1427),
    'Swansea': (51.6214, -3.9436),
    'Coventry': (52.4068, -1.5197),
    'Leicester': (52.6369, -1.1398),
    'Wolverhampton': (52.5870, -2.1288),
    'Stoke': (53.0027, -2.1794),
    'Derby': (52.9225, -1.4746),
    'Reading': (51.4543, -0.9781),
    'Milton Keynes': (52.0406, -0.7594),
    'Sunderland': (54.9069, -1.3838),
    'Croydon': (51.3762, -0.0982),
    'Kent': (51.2787, 0.5217),
    'Surrey': (51.3148, -0.5600),
    'Essex': (51.7343, 0.4691),
    'Cornwall': (50.2660, -5.0527),
    'Devon': (50.7156, -3.5309),
    'Norfolk': (52.6140, 0.8864),
    'Suffolk': (52.1872, 0.9708),
    'Dorset': (50.7488, -2.3445),
    'Wiltshire': (51.3492, -1.9927),
    'Hampshire': (51.0577, -1.3081),
    'Sussex': (50.9225, -0.1388),
    # Australia
    'Sydney': (-33.8688, 151.2093),
    'Melbourne': (-37.8136, 144.9631),
    'Brisbane': (-27.4698, 153.0251),
    'Perth': (-31.9505, 115.8605),
    'Adelaide': (-34.9285, 138.6007),
    'Canberra': (-35.2809, 149.1300),
    'Hobart': (-42.8821, 147.3272),
    'Darwin': (-12.4634, 130.8456),
    # Canada
    'Toronto': (43.6532, -79.3832),
    'Vancouver': (49.2827, -123.1207),
    'Montreal': (45.5017, -73.5673),
    'Calgary': (51.0447, -114.0719),
    'Edmonton': (53.5461, -113.4938),
    'Ottawa': (45.4215, -75.6972),
    'Winnipeg': (49.8951, -97.1384),
    'Halifax': (44.6488, -63.5752),
    'Victoria': (48.4284, -123.3656),
    'Quebec City': (46.8139, -71.2080),
    # Other international
    'Dubai': (25.2048, 55.2708),
    'Abu Dhabi': (24.4539, 54.3773),
    'Mumbai': (19.0760, 72.8777),
    'Delhi': (28.7041, 77.1025),
    'Bangalore': (12.9716, 77.5946),
    'Hyderabad': (17.3850, 78.4867),
    'Chennai': (13.0827, 80.2707),
    'Kolkata': (22.5726, 88.3639),
    'Pune': (18.5204, 73.8567),
    'Ahmedabad': (23.0225, 72.5714),
    'Berlin': (52.5200, 13.4050),
    'Munich': (48.1351, 11.5820),
    'Hamburg': (53.5511, 9.9937),
    'Frankfurt': (50.1109, 8.6821),
    'Paris': (48.8566, 2.3522),
    'Lyon': (45.7640, 4.8357),
    'Marseille': (43.2965, 5.3698),
    'Rome': (41.9028, 12.4964),
    'Milan': (45.4642, 9.1900),
    'Naples': (40.8518, 14.2681),
    'Madrid': (40.4168, -3.7038),
    'Barcelona': (41.3874, 2.1686),
    'Lisbon': (38.7223, -9.1393),
    'Amsterdam': (52.3676, 4.9041),
    'Brussels': (50.8503, 4.3517),
    'Vienna': (48.2082, 16.3738),
    'Zurich': (47.3769, 8.5417),
    'Geneva': (46.2044, 6.1432),
    'Stockholm': (59.3293, 18.0686),
    'Oslo': (59.9139, 10.7522),
    'Copenhagen': (55.6761, 12.5683),
    'Helsinki': (60.1699, 24.9384),
    'Warsaw': (52.2297, 21.0122),
    'Prague': (50.0755, 14.4378),
    'Budapest': (47.4979, 19.0402),
    'Athens': (37.9838, 23.7275),
    'Istanbul': (41.0082, 28.9784),
    'Ankara': (39.9334, 32.8597),
    'Bangkok': (13.7563, 100.5018),
    'Kuala Lumpur': (3.1390, 101.6869),
    'Jakarta': (-6.2088, 106.8456),
    'Manila': (14.5995, 120.9842),
    'Seoul': (37.5665, 126.9780),
    'Taipei': (25.0330, 121.5654),
    'Tokyo': (35.6762, 139.6503),
    'Osaka': (34.6937, 135.5023),
    'Beijing': (39.9042, 116.4074),
    'Shanghai': (31.2304, 121.4737),
    'Hong Kong': (22.3193, 114.1694),
    'Tehran': (35.6892, 51.3890),
    'Baghdad': (33.3152, 44.3661),
    'Riyadh': (24.7136, 46.6753),
    'Cairo': (30.0444, 31.2357),
    'Nairobi': (-1.2921, 36.8219),
    'Lagos': (6.5244, 3.3792),
    'Johannesburg': (-26.2041, 28.0473),
    'Cape Town': (-33.9249, 18.4241),
    'Lima': (-12.0464, -77.0428),
    'Bogota': (4.7110, -74.0721),
    'Santiago': (-33.4489, -70.6693),
    'Buenos Aires': (-34.6037, -58.3816),
    'Sao Paulo': (-23.5505, -46.6333),
    'Rio de Janeiro': (-22.9068, -43.1729),
    'Havana': (23.1136, -82.3666),
    'Nassau': (25.0480, -77.3554),
    'Kingston': (18.0179, -76.8099),
    'San Juan': (18.4655, -66.1057),
    'Islamabad': (33.6844, 73.0479),
    'Amman': (31.9454, 35.9284),
}


def clean_city_name(city: str) -> str:
    """Remove parenthetical notes and extra text from city names."""
    # Remove (UK/England), (QLD, Australia), etc.
    city = re.sub(r'\s*\([^)]*\)\s*', ' ', city).strip()
    # Remove "approx", "near", "west of", etc. modifiers
    city = re.sub(r'\s*(approx|near|north|south|east|west|outside|between)\s+.*$', '', city, flags=re.IGNORECASE).strip()
    # Remove trailing commas/spaces
    city = city.strip(', ')
    return city


def parse_location(loc: str) -> Optional[Tuple[float, float]]:
    """Parse a location string and return (lat, lng) or None."""
    if not loc or loc.strip() in ('', ',', ', ,', ', , ', 'Unspecified', ', , Unspecified'):
        return None

    loc = loc.strip()
    parts = [p.strip() for p in loc.split(',')]

    # Extract any country info from parentheses in first part
    paren_match = re.search(r'\(([^)]+)\)', parts[0])
    paren_content = paren_match.group(1) if paren_match else ''

    # Clean city name
    city_raw = parts[0].strip()
    city = clean_city_name(city_raw)

    state = parts[1].strip() if len(parts) >= 2 else ''
    country = parts[2].strip() if len(parts) >= 3 else ''

    # Handle "UK/England", "UK/Scotland", etc. in parentheses
    if 'UK/' in paren_content or 'UK/' in city_raw:
        # Check international cities first
        if city in INTL_CITIES:
            lat, lng = INTL_CITIES[city]
            return (lat + random.uniform(-0.02, 0.02),
                    lng + random.uniform(-0.02, 0.02))
        # Fall back to UK coords
        if 'Scotland' in paren_content:
            lat, lng = COUNTRY_COORDS['Scotland']
        elif 'Wales' in paren_content:
            lat, lng = COUNTRY_COORDS['Wales']
        elif 'Ireland' in paren_content:
            lat, lng = COUNTRY_COORDS['Northern Ireland']
        else:
            lat, lng = COUNTRY_COORDS['England']
        return (lat + random.uniform(-0.5, 0.5),
                lng + random.uniform(-0.5, 0.5))

    # Check international cities (exact match on cleaned city)
    if city in INTL_CITIES:
        lat, lng = INTL_CITIES[city]
        return (lat + random.uniform(-0.02, 0.02),
                lng + random.uniform(-0.02, 0.02))

    # Check US state code
    if len(parts) >= 2:
        state_abbr = state.upper().strip()
        if len(state_abbr) == 2 and state_abbr in US_STATES:
            lat, lng = US_STATES[state_abbr]
            return (lat + random.uniform(-0.5, 0.5),
                    lng + random.uniform(-0.5, 0.5))

        # Check full state names
        state_lower = state.lower().strip()
        if state_lower in STATE_NAMES:
            abbr = STATE_NAMES[state_lower]
            lat, lng = US_STATES[abbr]
            return (lat + random.uniform(-0.5, 0.5),
                    lng + random.uniform(-0.5, 0.5))

        # Check Canadian provinces
        if state_abbr in CA_PROVINCES:
            lat, lng = CA_PROVINCES[state_abbr]
            return (lat + random.uniform(-0.5, 0.5),
                    lng + random.uniform(-0.5, 0.5))

    # Match country from country field, parentheses, or full location
    search_text = f"{country} {paren_content} {loc}"
    for cname, coords in COUNTRY_COORDS.items():
        if cname.lower() in search_text.lower():
            lat, lng = coords
            return (lat + random.uniform(-1, 1),
                    lng + random.uniform(-1, 1))

    # Last resort: try matching city name against international cities
    # with partial matching (e.g., "Milton Keynes" vs "Milon Keynes")
    city_lower = city.lower()
    for cname, coords in INTL_CITIES.items():
        if cname.lower() == city_lower or (len(city_lower) > 4 and cname.lower().startswith(city_lower[:4])):
            lat, lng = coords
            return (lat + random.uniform(-0.02, 0.02),
                    lng + random.uniform(-0.02, 0.02))

    # Try to match country from location text as last resort
    loc_lower = loc.lower()
    for cname, coords in COUNTRY_COORDS.items():
        if cname.lower() in loc_lower:
            lat, lng = coords
            return (lat + random.uniform(-1, 1),
                    lng + random.uniform(-1, 1))

    return None


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Geocode remaining NUFORC locations')
    parser.add_argument('--batch-size', type=int, default=500, help='Update batch size')
    parser.add_argument('--dry-run', action='store_true', help='Count only, no updates')
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Signal 626 - Remaining Records Geocoder")
    logger.info("Handles UK, international, and edge cases")
    logger.info("=" * 60)

    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Connected to Supabase")

    # Fetch all records still missing coordinates
    logger.info("Fetching records without coordinates...")

    all_records = []
    offset = 0
    batch = 1000

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

    if not all_records:
        logger.info("No records to geocode!")
        return

    if args.dry_run:
        found = 0
        not_found = []
        for r in all_records:
            if parse_location(r['location']):
                found += 1
            else:
                not_found.append(r['location'])
        logger.info(f"Would geocode: {found}/{len(all_records)} ({100*found/max(len(all_records),1):.1f}%)")
        logger.info(f"Still unresolvable: {len(not_found)}")
        # Show sample of unresolvable
        for loc in not_found[:20]:
            logger.info(f"  SKIP: {loc}")
        return

    # Deduplicate records by ID
    seen_ids = set()
    unique_records = []
    for r in all_records:
        if r['id'] not in seen_ids:
            seen_ids.add(r['id'])
            unique_records.append(r)
    if len(unique_records) < len(all_records):
        logger.info(f"Removed {len(all_records) - len(unique_records)} duplicate records")
    all_records = unique_records

    # Geocode and update
    updates = []
    skipped = 0
    geocoded = 0
    skip_samples = []
    batch_ids = set()

    for i, record in enumerate(all_records):
        coords = parse_location(record['location'])
        if coords and record['id'] not in batch_ids:
            updates.append({
                'id': record['id'],
                'latitude': round(coords[0], 6),
                'longitude': round(coords[1], 6),
            })
            batch_ids.add(record['id'])
            geocoded += 1
        else:
            skipped += 1
            if len(skip_samples) < 20 and not coords:
                skip_samples.append(record['location'])

        if len(updates) >= args.batch_size:
            try:
                client.table('nuforc_sightings').upsert(
                    updates, on_conflict='id'
                ).execute()
                logger.info(f"Updated batch: {geocoded} geocoded, {skipped} skipped "
                           f"({i+1}/{len(all_records)})")
            except Exception as e:
                logger.error(f"Batch update error: {e}")
                # Try one-by-one for failed batch
                for update in updates:
                    try:
                        client.table('nuforc_sightings').upsert(
                            [update], on_conflict='id'
                        ).execute()
                    except Exception:
                        pass
            updates = []
            batch_ids = set()

    # Final batch
    if updates:
        try:
            client.table('nuforc_sightings').upsert(
                updates, on_conflict='id'
            ).execute()
        except Exception as e:
            logger.error(f"Final batch error: {e}")
            # Try one-by-one for failed batch
            for update in updates:
                try:
                    client.table('nuforc_sightings').upsert(
                        [update], on_conflict='id'
                    ).execute()
                except Exception:
                    pass

    logger.info("=" * 60)
    logger.info(f"COMPLETE!")
    logger.info(f"  Geocoded: {geocoded}")
    logger.info(f"  Skipped: {skipped}")
    logger.info(f"  Coverage: {100*geocoded/max(len(all_records),1):.1f}%")
    logger.info("=" * 60)

    if skip_samples:
        logger.info("Sample skipped locations:")
        for loc in skip_samples:
            logger.info(f"  {loc}")


if __name__ == '__main__':
    main()

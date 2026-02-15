<div align="center">

# SIGNAL 626

### `[ CLASSIFIED // UFO INTELLIGENCE PLATFORM ]`

**Interactive global map of 150,000+ UFO sightings spanning 626 years**

*Tactical intelligence interface for exploring NUFORC data from 1400 to 2026*

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

`150,554 REPORTS` | `626 YEARS` | `15+ SHAPES` | `REAL-TIME CLUSTERING` | `3 HEATMAP MODES`

</div>

---

## Overview

**Signal 626** is a high-performance, full-stack geospatial intelligence platform that visualizes over **150,000 UFO sighting reports** from the [National UFO Reporting Center (NUFORC)](https://nuforc.org/) database. Built with a sci-fi tactical interface aesthetic, it lets users explore sightings across **626 years of history** with temporal playback, advanced filtering, and multiple visualization modes.

The name **"626"** represents the span of years covered: from the earliest recorded sighting in **1400 AD** to the present day **2026**.

---

## Features

### Interactive Global Map
- **Real-time clustering** powered by Supercluster — handles 150k+ points at 60fps
- **Color-coded markers** by UFO shape type (15+ categories)
- **Zoom-adaptive rendering** — clusters break apart as you zoom in to reveal individual sightings
- **Click any marker** to view full sighting details in the intelligence panel
- Dark-themed CartoDB tiles with custom styling

### Heatmap Visualization
- **Three distinct modes** for different analysis perspectives:
  - **Density** — Standard concentration mapping
  - **Clusters** — Macro hotspot patterns with wider radius
  - **Precision** — Exact location detail at high resolution
- Sci-fi green/cyan color gradient
- Smooth 300ms fade transitions
- Toggle and switch modes from the filter bar

### Temporal Playback Engine
- **Animated timeline** from 1400 to 2026
- Play/pause with adjustable speed (1x, 2x, 5x)
- Step forward/backward through individual years
- **Non-linear slider** — equal space for each era (1400s, 1800s, 1900s, etc.)
- Quick-select buttons for key historical years
- Auto-loop at the end of the timeline

### Intelligence Panel
- Slides in on marker selection with spring physics animation
- Displays all available fields: date, location, shape, color, duration, observers, size, speed, distance, direction, elevation angle, characteristics, and witness summary
- Direct links to original NUFORC reports

### Shape Filtering
- Filter sightings by any of the 15+ reported UFO shapes
- Shapes include: Light, Circle, Triangle, Fireball, Sphere, Disk, Oval, Cylinder, Formation, Diamond, Changing, Chevron, Flash, Cigar, Rectangle, and more

### Data Export
- Export current year's sighting data as JSON with one click

### Visual Design
- **Glassmorphism** panels with frosted-glass blur effects
- **Scanline animation** — subtle CRT-style horizontal sweep
- **Grid overlay** — tactical interface background pattern
- **Vignette effect** — darkened edges for depth
- **Glow effects** — text and border luminance in white, cyan, amber, and red
- **Custom typography** — Orbitron (headers), JetBrains Mono (data), Rajdhani (body)

### Fully Responsive
- Optimized layouts for mobile, tablet, and desktop
- Touch-optimized controls with haptic-style feedback
- Safe area support for notched devices
- Adaptive quick-select years (6 on mobile, 10 on desktop)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.7 |
| **Styling** | TailwindCSS 3.4 + Custom CSS |
| **Animation** | Framer Motion 11.15 |
| **Maps** | Leaflet 1.9.4 + React Leaflet 4.2 |
| **Clustering** | Supercluster 8.0 |
| **Heatmap** | Leaflet.Heat 0.2 |
| **Data Fetching** | TanStack React Query 5.62 |
| **Database** | Supabase (PostgreSQL) |
| **Geocoding** | Python 3 + geopy (Nominatim) |
| **Image Optimization** | Sharp 0.34 |

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout, meta tags, overlays
│   ├── page.tsx                # Main interactive page
│   ├── providers.tsx           # React Query provider
│   ├── globals.css             # Animations, effects, Leaflet overrides
│   └── api/
│       ├── sightings/route.ts  # GET /api/sightings?year=&shape=
│       ├── sighting/[id]/      # GET /api/sighting/:id
│       ├── year-counts/        # GET /api/year-counts
│       └── stats/              # GET /api/stats
├── components/
│   ├── Map/
│   │   ├── MapView.tsx         # Leaflet map + clusters + heatmap
│   │   └── DynamicMap.tsx      # SSR-disabled lazy loader
│   ├── Timeline/
│   │   └── TimelineControl.tsx # Playback controls + slider
│   ├── Filters/
│   │   └── FilterBar.tsx       # Shape filter + heatmap + export
│   ├── Panel/
│   │   └── SightingPanel.tsx   # Sighting detail view
│   └── HUD/
│       └── StatsHUD.tsx        # Header stats bar
├── hooks/
│   ├── useSightings.ts         # Fetch sightings by year + shape
│   ├── useYearCounts.ts        # Fetch year histogram
│   ├── useTimeline.ts          # Playback state machine
│   └── useStats.ts             # Global statistics
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── constants.ts            # Colors, config, speeds
│   ├── utils.ts                # Date/location formatting
│   └── supabase.ts             # Supabase client
└── types/
    └── leaflet.heat.d.ts       # Heatmap type declarations
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Supabase** account (free tier works)
- **Python 3** (only for geocoding — optional if using pre-geocoded data)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/signal-626.git
cd signal-626
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Import NUFORC sighting data into a table named `nuforc_sightings`
3. Run the database migration to add coordinate columns, indexes, and RPC functions:

```sql
-- Run the contents of setup.sql in Supabase SQL Editor
```

### 3. Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

### 4. Geocode Locations (if needed)

```bash
# Fast geocoding (~5 min, US state centroids + major cities)
python fast_geocode.py

# Precise geocoding (~4-5 hours, uses Nominatim API)
python geocode_locations.py
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Schema

### Table: `nuforc_sightings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int8 | Primary key |
| `occurred` | timestamp | Date/time of sighting |
| `reported` | timestamp | Date/time reported |
| `location` | text | Raw location string |
| `shape` | text | UFO shape (Light, Triangle, etc.) |
| `color` | text | Observed color |
| `duration` | text | Duration of sighting |
| `summary` | text | Witness description |
| `num_observers` | text | Number of witnesses |
| `estimated_size` | text | Estimated object size |
| `viewed_from` | text | Observation point |
| `direction_from_viewer` | text | Direction observed |
| `angle_of_elevation` | text | Elevation angle |
| `closest_distance` | text | Nearest distance |
| `estimated_speed` | text | Estimated speed |
| `characteristics` | text | Physical characteristics |
| `location_details` | text | Additional location info |
| `url` | text | Link to NUFORC report |
| `latitude` | float8 | Geocoded latitude |
| `longitude` | float8 | Geocoded longitude |

### RPC Functions

- **`get_year_counts()`** — Returns `{year, count}` for all years with geocoded records
- **`get_shape_counts()`** — Returns `{shape, count}` for top shape types
- **`get_sightings_by_year(year, shape_filter)`** — Returns sighting coordinates filtered by year and optional shape

---

## API Endpoints

| Endpoint | Method | Description | Cache |
|----------|--------|-------------|-------|
| `/api/sightings?year=2020&shape=Light` | GET | Sightings for a year with optional shape filter | 5 min |
| `/api/sighting/12345` | GET | Single sighting full details | 1 hour |
| `/api/year-counts` | GET | Year histogram (count per year) | 1 hour |
| `/api/stats` | GET | Total reports, shapes, year range | 1 hour |

All API routes use **RPC functions first** for speed (~100ms), with automatic **REST pagination fallback** if RPC is unavailable.

---

## Performance

| Metric | Detail |
|--------|--------|
| **Data Points** | 150,554 sightings rendered via clustering |
| **Clustering** | Supercluster reduces to ~500-1000 visible markers |
| **Map FPS** | 60fps during pan/zoom with clustering |
| **Initial Load** | Map component lazy-loaded (code splitting) |
| **API Response** | ~100ms with RPC, <500ms with REST fallback |
| **Caching** | Multi-layer: React Query + HTTP cache headers |
| **Geocode Coverage** | 149,964 / 150,554 records (99.6%) |

---

## Data Source

All sighting data is sourced from the **[National UFO Reporting Center (NUFORC)](https://nuforc.org/)**, a non-profit organization that has been collecting and investigating UFO reports since 1974. The dataset includes reports dating back to 1400 AD, with the majority of records from the 1990s onward.

---

## Scripts

| Script | Purpose | Speed |
|--------|---------|-------|
| `fast_geocode.py` | US state centroids + major cities lookup | ~5 minutes |
| `geocode_locations.py` | Precise geocoding via Nominatim API | ~4-5 hours |
| `geocode_remaining.py` | Handle edge cases from main geocoding | Variable |

---

## License

This project is for educational and research purposes. NUFORC data is publicly available.

---

<div align="center">

**`[ SIGNAL 626 // END TRANSMISSION ]`**

*Built with curiosity about what's out there.*

</div>

-- ============================================================
-- Signal 626 - Database Setup
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Add latitude/longitude columns
ALTER TABLE nuforc_sightings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE nuforc_sightings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sightings_occurred ON nuforc_sightings (occurred);
CREATE INDEX IF NOT EXISTS idx_sightings_coords ON nuforc_sightings (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sightings_shape ON nuforc_sightings (shape);

-- Step 3: Create an RPC function for year counts (only records with coordinates)
CREATE OR REPLACE FUNCTION get_year_counts()
RETURNS TABLE(year INT, count BIGINT) AS $$
  SELECT
    EXTRACT(YEAR FROM occurred)::INT as year,
    COUNT(*) as count
  FROM nuforc_sightings
  WHERE occurred IS NOT NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  GROUP BY EXTRACT(YEAR FROM occurred)::INT
  ORDER BY year ASC;
$$ LANGUAGE sql STABLE;

-- Step 4: Create an RPC for shape counts
CREATE OR REPLACE FUNCTION get_shape_counts()
RETURNS TABLE(shape TEXT, count BIGINT) AS $$
  SELECT shape, COUNT(*) as count
  FROM nuforc_sightings
  WHERE shape IS NOT NULL
  GROUP BY shape
  ORDER BY count DESC;
$$ LANGUAGE sql STABLE;

-- Step 5: Create an RPC for sightings by year (optimized)
CREATE OR REPLACE FUNCTION get_sightings_by_year(target_year INT, shape_filter TEXT DEFAULT NULL)
RETURNS TABLE(
  id INT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  shape TEXT,
  occurred TIMESTAMPTZ,
  location TEXT
) AS $$
  SELECT s.id, s.latitude, s.longitude, s.shape, s.occurred, s.location
  FROM nuforc_sightings s
  WHERE EXTRACT(YEAR FROM s.occurred) = target_year
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND (shape_filter IS NULL OR shape_filter = 'All' OR s.shape = shape_filter);
$$ LANGUAGE sql STABLE;

-- Verify
SELECT COUNT(*) as total_records FROM nuforc_sightings;
SELECT COUNT(*) as with_coordinates FROM nuforc_sightings WHERE latitude IS NOT NULL;

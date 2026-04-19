/**
 * Google Places API (New) — Nearby Mosque Search
 * Endpoint: /api/mosques/nearby?lat=...&lng=...
 *
 * Requires env var: GOOGLE_PLACES_API_KEY
 * Returns: JSON array of nearby mosques with distance in meters
 */

// In-memory cache keyed by "lat2:lng2" (rounded to 2 decimal places ≈ 1km)
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!KEY) return res.status(503).json({ error: 'PLACES_KEY_MISSING' });

  // Validate inputs
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid or missing lat/lng parameters' });
  }

  // Cache key: round to 2 decimal places (~1.1 km precision)
  const cacheKey = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(cached.data);
  }

  // Call Google Places API (New) — Nearby Search
  let gData;
  try {
    const gRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.id',
      },
      body: JSON.stringify({
        includedTypes: ['mosque'],
        maxResultCount: 10,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 20000, // 20 km
          },
        },
      }),
    });

    if (!gRes.ok) {
      const errBody = await gRes.json().catch(() => ({}));
      console.error('Google Places API error:', JSON.stringify(errBody));
      return res.status(502).json({
        error: errBody?.error?.message || `Google Places returned ${gRes.status}`,
      });
    }

    gData = await gRes.json();
  } catch (e) {
    console.error('Google Places fetch error:', e);
    return res.status(500).json({ error: 'Failed to reach Google Places API' });
  }

  // Clean and transform response
  const places = (gData.places || []).map((p) => ({
    id: p.id || '',
    name: p.displayName?.text || 'Mosque',
    address: p.formattedAddress || '',
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
    distanceMeters: Math.round(
      haversineMeters(lat, lng, p.location?.latitude ?? lat, p.location?.longitude ?? lng)
    ),
  }));

  // Sort by distance (API returns by distance already, but ensure it)
  places.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Store in cache
  cache.set(cacheKey, { ts: Date.now(), data: places });

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(places);
}

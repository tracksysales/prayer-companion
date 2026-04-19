/**
 * Google Cloud TTS — Chirp3-HD Puck voice
 * Used for high-quality English narration of Prophets' Stories.
 *
 * Requires env var: GOOGLE_TTS_API_KEY
 * Returns: audio/mpeg binary (MP3)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
  if (!GOOGLE_TTS_API_KEY) {
    return res.status(503).json({ error: 'TTS_KEY_MISSING' });
  }

  const { text, languageCode = 'en-US', voiceName = 'en-US-Chirp3-HD-Puck' } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text required' });
  }

  // Google TTS limit: ~5000 chars. Truncate gracefully with ellipsis.
  const safeText = text.length > 4800 ? text.slice(0, 4800) + '…' : text;

  try {
    const gRes = await fetch(
      `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: safeText },
          voice: { languageCode, name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 0 },
        }),
      }
    );

    if (!gRes.ok) {
      const err = await gRes.json().catch(() => ({}));
      console.error('Google TTS error:', err);
      return res.status(502).json({ error: err?.error?.message || 'Google TTS request failed' });
    }

    const data = await gRes.json();
    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).send(audioBuffer);
  } catch (e) {
    console.error('TTS handler error:', e);
    res.status(500).json({ error: 'TTS unavailable' });
  }
}

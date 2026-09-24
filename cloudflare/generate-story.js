// Cloudflare Worker: generiert eine Gute-Nacht-Geschichte via Anthropic API.
// Ersetzt die frühere Netlify Function (netlify/functions/generate-story.js).
// Der API-Key liegt NUR als Worker-Secret vor (ANTHROPIC_API_KEY) und wird
// nie an den Browser ausgeliefert.
//
// Setze ALLOWED_ORIGIN in wrangler.toml oder als Secret auf deine
// GitHub-Pages-URL (z.B. "https://<user>.github.io"), damit nur deine
// Seite die Function aufrufen darf.

const DURATION_WORDS = {
  kurz: '400-600',
  mittel: '900-1200',
  lang: '1500-1900',
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(status, body, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method !== 'POST') {
      return json(405, { error: 'Method Not Allowed' }, env);
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'Kein API-Key gefunden (ANTHROPIC_API_KEY ist als Worker-Secret nicht gesetzt).' }, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json(400, { error: 'Ungültiger Request-Body.' }, env);
    }

    const name = (payload.name || '').toString().slice(0, 40) || null;
    const age = payload.age ? String(payload.age).slice(0, 3) : null;
    const gender = payload.gender ? String(payload.gender).slice(0, 20) : null;
    const genres = Array.isArray(payload.genres) ? payload.genres.slice(0, 5) : [];
    const duration = ['kurz', 'mittel', 'lang'].includes(payload.duration) ? payload.duration : 'mittel';
    const wordTarget = DURATION_WORDS[duration];

    if (genres.length === 0) {
      return json(400, { error: 'Mindestens ein Genre wird benötigt.' }, env);
    }

    const childDesc = [
      name ? `Name: ${name}` : null,
      age ? `Alter: ${age} Jahre` : null,
      gender ? `Geschlecht: ${gender}` : null,
    ].filter(Boolean).join(', ') || 'keine Angaben, frei wählbar';

    const systemPrompt = `Du bist ein einfühlsamer Autor von Gute-Nacht-Geschichten für Kinder auf Deutsch (Österreich).
Regeln:
- Warmer, beruhigender, altersgerechter Ton, keine Angst- oder Gruselelemente.
- Die Geschichte endet friedlich und schläfrig, mit einer direkten "Gute Nacht"-Verabschiedung an das Kind.
- Ziel-Länge: ca. ${wordTarget} Wörter.
- Antworte AUSSCHLIESSLICH als JSON-Objekt mit den Feldern "title" (kurzer Titel) und "story" (die Geschichte, Absätze getrennt durch doppelte Zeilenumbrüche). Kein Markdown, kein Codeblock, kein zusätzlicher Text.`;

    const userPrompt = `Kinderprofil: ${childDesc}
Gewünschte Genres/Themen (kombiniere sie kreativ): ${genres.join(', ')}
Lesedauer: ${duration}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return json(502, { error: 'Anthropic API Fehler: ' + errText }, env);
      }

      const data = await res.json();
      const textBlock = (data.content || []).find((b) => b.type === 'text');
      const raw = textBlock ? textBlock.text.trim() : '';

      let parsed;
      try {
        const cleaned = raw.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        parsed = { title: 'Gute Nacht Geschichte', story: raw };
      }

      return json(200, parsed, env);
    } catch (err) {
      return json(500, { error: err.message }, env);
    }
  },
};

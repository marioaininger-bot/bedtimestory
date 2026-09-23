// Netlify Function: generiert eine Gute-Nacht-Geschichte via Anthropic API.
// Der API-Key liegt NUR als Environment Variable auf Netlify (ANTHROPIC_API_KEY) -
// wird nie an den Browser ausgeliefert.

const DURATION_WORDS = {
  kurz: '400-600',
  mittel: '900-1200',
  lang: '1500-1900',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY ist auf Netlify nicht gesetzt.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiger Request-Body.' }) };
  }

  const name = (payload.name || '').toString().slice(0, 40) || null;
  const age = payload.age ? String(payload.age).slice(0, 3) : null;
  const gender = payload.gender ? String(payload.gender).slice(0, 20) : null;
  const genres = Array.isArray(payload.genres) ? payload.genres.slice(0, 5) : [];
  const duration = ['kurz', 'mittel', 'lang'].includes(payload.duration) ? payload.duration : 'mittel';
  const wordTarget = DURATION_WORDS[duration];

  if (genres.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Mindestens ein Genre wird benötigt.' }) };
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
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Anthropic API Fehler: ' + errText }) };
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

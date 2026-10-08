// Cœur partagé du « Professeur IA ».
// Ce fichier est utilisé à la fois par :
//   - le serveur de développement Vite (vite.config.ts) ;
//   - la fonction Supabase Edge « teacher » (Deno) en production.
// Il ne doit donc importer AUCUN module : uniquement du TypeScript standard et `fetch`.
//
// Le fournisseur de modèle est appelé via l'API « chat completions » compatible OpenAI,
// proposée par de nombreux services (Groq, Google Gemini, Mistral, OpenRouter) et par
// Ollama en local. La clé secrète reste côté serveur : le navigateur ne la voit jamais.

export type TeacherMode = 'guided' | 'conversation' | 'immersion' | 'correction' | 'situation' | 'review';

export interface TeacherMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TeacherRequest {
  mode: TeacherMode;
  /** Niveau estimé (A1 → C1), indicatif. */
  level: string;
  /** 0 = consignes en français … 3 = tout en anglais. */
  immersion: number;
  topic?: string;
  scenario?: string;
  weakWords?: string[];
  weakConcepts?: string[];
  messages: TeacherMessage[];
}

export interface TeacherCorrection {
  original: string;
  corrected: string;
  /** "error" = erreur certaine ; "style" = suggestion de formulation plus naturelle. */
  kind: 'error' | 'style';
  explanationFr: string;
}

export interface TeacherResponse {
  reply: string;
  corrections: TeacherCorrection[];
  betterVersion?: string;
  tipFr?: string;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

export const LIMITS = {
  maxMessages: 14,
  maxMessageChars: 1200,
  maxListItems: 15,
  maxListItemChars: 60,
  maxTopicChars: 120,
};

const MODES: TeacherMode[] = ['guided', 'conversation', 'immersion', 'correction', 'situation', 'review'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, LIMITS.maxListItemChars))
    .filter(Boolean)
    .slice(0, LIMITS.maxListItems);
}

/** Valide strictement la requête reçue du navigateur. */
export function validateTeacherRequest(body: unknown): { ok: true; value: TeacherRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Requête invalide.' };
  const b = body as Record<string, unknown>;
  if (typeof b.mode !== 'string' || !MODES.includes(b.mode as TeacherMode)) return { ok: false, error: 'Mode inconnu.' };
  const level = typeof b.level === 'string' && LEVELS.includes(b.level) ? b.level : 'A2';
  const immersion = typeof b.immersion === 'number' ? Math.max(0, Math.min(3, Math.round(b.immersion))) : 1;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return { ok: false, error: 'Aucun message.' };
  const messages: TeacherMessage[] = [];
  for (const m of b.messages.slice(-LIMITS.maxMessages)) {
    if (!m || typeof m !== 'object') return { ok: false, error: 'Message invalide.' };
    const mm = m as Record<string, unknown>;
    if (mm.role !== 'user' && mm.role !== 'assistant') return { ok: false, error: 'Rôle invalide.' };
    if (typeof mm.content !== 'string' || !mm.content.trim()) return { ok: false, error: 'Message vide.' };
    if (mm.content.length > LIMITS.maxMessageChars) return { ok: false, error: `Message trop long (max ${LIMITS.maxMessageChars} caractères).` };
    messages.push({ role: mm.role, content: mm.content });
  }
  if (messages[messages.length - 1].role !== 'user') return { ok: false, error: 'Le dernier message doit venir de l’apprenant.' };
  const topic = typeof b.topic === 'string' ? b.topic.slice(0, LIMITS.maxTopicChars) : undefined;
  const scenario = typeof b.scenario === 'string' ? b.scenario.slice(0, LIMITS.maxTopicChars) : undefined;
  return {
    ok: true,
    value: {
      mode: b.mode as TeacherMode,
      level,
      immersion,
      topic,
      scenario,
      weakWords: cleanList(b.weakWords),
      weakConcepts: cleanList(b.weakConcepts),
      messages,
    },
  };
}

const MODE_INSTRUCTIONS: Record<TeacherMode, string> = {
  guided:
    'GUIDED MODE: help the learner build each sentence. Offer a sentence frame or 3–5 useful words, ask one simple question at a time, and praise complete sentences.',
  conversation:
    'CONVERSATION MODE: have a natural conversation. Respond to the content first, then ask one follow-up question. Put corrections only in the "corrections" field.',
  immersion:
    'IMMERSION MODE: speak only English in "reply". Use simple paraphrases instead of translations. If the learner explicitly asks for French, give the explanation in "tipFr" and continue in English.',
  correction:
    'CORRECTION MODE: the learner submits sentences to correct. In "reply", give the corrected sentence and a short encouraging comment. List every issue in "corrections".',
  situation:
    'ROLE-PLAY MODE: stay in character for the scenario. Keep turns short and realistic, react to what the learner says, and move the situation forward.',
  review:
    'REVIEW MODE: make the learner reuse the weak words and grammar points listed below. Ask questions that require them, one at a time.',
};

/** Construit le prompt système côté serveur (le navigateur ne peut pas l'imposer). */
export function buildSystemPrompt(req: TeacherRequest): string {
  const immersionText = [
    'Explanations and tips may be in French; keep your conversational reply in simple English.',
    'Reply in English; keep French for short explanations in corrections and tipFr.',
    'Reply in natural English; French only in corrections explanations.',
    'Reply only in English; French only inside corrections explanations or when explicitly requested.',
  ][req.immersion];
  const lines = [
    'You are Léon, a warm, demanding English teacher for French-speaking adults in an intensive programme called LÉON ACADÉMIE.',
    `Learner estimated level: ${req.level} (pedagogical estimate, not a certification). Adapt vocabulary and sentence length to this level, slightly above it to stretch them.`,
    immersionText,
    MODE_INSTRUCTIONS[req.mode],
    'Rules:',
    '- Do not answer for the learner. Ask them to say it themselves; encourage full sentences.',
    '- Ask at most one question per turn. Keep "reply" under 80 words.',
    '- Correct only important errors (grammar, wrong word, misunderstanding). Mark them kind "error".',
    '- Understandable but unnatural phrasing gets kind "style" with a more natural version. Never mark a correct variant as an error.',
    '- Write every "explanationFr" in French, short and concrete.',
    '- If the learner writes in French, help them say it in English and ask them to try.',
    '- Never claim to evaluate pronunciation: you only see text (possibly a speech transcription).',
  ];
  if (req.topic) lines.push(`Conversation topic: ${req.topic}.`);
  if (req.scenario) lines.push(`Role-play scenario: ${req.scenario}.`);
  if (req.weakWords?.length) lines.push(`Words the learner is still learning (reuse them naturally): ${req.weakWords.join(', ')}.`);
  if (req.weakConcepts?.length) lines.push(`Grammar points the learner struggles with: ${req.weakConcepts.join(', ')}.`);
  lines.push(
    'Answer ONLY with a JSON object, no markdown, using exactly this shape:',
    '{"reply": string, "corrections": [{"original": string, "corrected": string, "kind": "error" | "style", "explanationFr": string}], "betterVersion": string | null, "tipFr": string | null}',
    '"betterVersion" is a natural rewrite of the learner’s last message (null if already natural).',
  );
  return lines.join('\n');
}

/** Analyse la réponse du modèle de façon tolérante. */
export function parseTeacherReply(text: string): TeacherResponse {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const data = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      if (typeof data.reply === 'string' && data.reply.trim()) {
        const corrections: TeacherCorrection[] = Array.isArray(data.corrections)
          ? data.corrections
              .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
              .filter((c) => typeof c.original === 'string' && typeof c.corrected === 'string')
              .slice(0, 8)
              .map((c) => ({
                original: String(c.original),
                corrected: String(c.corrected),
                kind: c.kind === 'style' ? 'style' : 'error',
                explanationFr: typeof c.explanationFr === 'string' ? c.explanationFr : '',
              }))
          : [];
        return {
          reply: data.reply.trim(),
          corrections,
          betterVersion: typeof data.betterVersion === 'string' && data.betterVersion.trim() ? data.betterVersion.trim() : undefined,
          tipFr: typeof data.tipFr === 'string' && data.tipFr.trim() ? data.tipFr.trim() : undefined,
        };
      }
    } catch {
      // On retombe sur le texte brut ci-dessous.
    }
  }
  return { reply: trimmed || '…', corrections: [] };
}

export class TeacherError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Appelle le fournisseur compatible OpenAI. */
export async function callTeacher(config: ProviderConfig, req: TeacherRequest): Promise<TeacherResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 25000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.6,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: buildSystemPrompt(req) }, ...req.messages],
      }),
    });
    if (res.status === 429) throw new TeacherError('Le fournisseur IA a atteint sa limite (quota gratuit). Réessayez plus tard.', 429);
    if (res.status === 401 || res.status === 403) throw new TeacherError('Clé API refusée par le fournisseur. Vérifiez la configuration serveur.', 502);
    if (!res.ok) throw new TeacherError(`Erreur du fournisseur IA (${res.status}).`, 502);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new TeacherError('Réponse IA inattendue.', 502);
    return parseTeacherReply(content);
  } catch (e) {
    if (e instanceof TeacherError) throw e;
    if (e instanceof Error && e.name === 'AbortError') throw new TeacherError('Le fournisseur IA ne répond pas (délai dépassé).', 504);
    throw new TeacherError('Impossible de joindre le fournisseur IA.', 502);
  } finally {
    clearTimeout(timer);
  }
}

/** Limiteur simple en mémoire (développement / petit serveur). */
export function createMemoryRateLimiter(perMinute: number, perDay: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const list = (hits.get(key) ?? []).filter((t) => now - t < 86_400_000);
    const lastMinute = list.filter((t) => now - t < 60_000).length;
    if (lastMinute >= perMinute || list.length >= perDay) {
      hits.set(key, list);
      return false;
    }
    list.push(now);
    hits.set(key, list);
    return true;
  };
}

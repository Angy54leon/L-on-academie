// Fonction Edge Supabase « teacher » : proxy sécurisé vers le modèle d'IA.
// - La clé AI_API_KEY reste ici (secret Supabase), jamais dans le navigateur.
// - Seuls les utilisateurs connectés peuvent l'appeler (vérification du jeton).
// - Un quota quotidien par utilisateur protège votre offre gratuite (AI_DAILY_LIMIT).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { callTeacher, TeacherError, validateTeacherRequest } from '../_shared/teacher-core.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const baseUrl = Deno.env.get('AI_BASE_URL');
  const model = Deno.env.get('AI_MODEL');
  const configured = Boolean(baseUrl && model);
  if (req.method === 'GET') return json(200, { configured, provider: configured ? 'openai-compatible' : null });
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });
  if (!configured) return json(503, { error: 'Professeur IA non configuré.' });

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json(401, { error: 'Connectez-vous pour utiliser le professeur IA.' });

  // Validation AVANT de consommer le quota : une requête invalide ne coûte rien.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }
  const parsed = validateTeacherRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error });

  const limit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '50');
  const { data: allowed, error: quotaError } = await supabase.rpc('consume_ai_quota', { daily_limit: limit });
  if (quotaError) {
    console.error(JSON.stringify({ event: 'teacher_quota_error', code: quotaError.code }));
    return json(500, { error: 'Erreur de quota. Réessayez dans un instant.' });
  }
  if (!allowed) return json(429, { error: `Limite quotidienne de ${limit} échanges atteinte. Le partenaire local reste disponible.` });

  const started = Date.now();
  try {
    const reply = await callTeacher({ baseUrl: baseUrl!, apiKey: Deno.env.get('AI_API_KEY') ?? undefined, model: model! }, parsed.value);
    console.log(JSON.stringify({ event: 'teacher_ok', mode: parsed.value.mode, ms: Date.now() - started, turns: parsed.value.messages.length }));
    return json(200, reply);
  } catch (e) {
    // Journal technique uniquement : jamais le contenu des messages ni de clé.
    console.error(JSON.stringify({ event: 'teacher_error', code: e instanceof TeacherError ? e.code : 'internal', status: e instanceof TeacherError ? e.status : 500, ms: Date.now() - started }));
    if (e instanceof TeacherError) return json(e.status, { error: e.message });
    return json(500, { error: 'Erreur interne du professeur IA. Réessayez.' });
  }
});

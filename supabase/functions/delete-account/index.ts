// Fonction Edge Supabase « delete-account » : supprime le compte de l'utilisateur connecté
// et, par cascade, toutes ses données (progression, statistiques, groupes créés, quotas).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return json(401, { error: 'Non connecté.' });

  // La clé « service role » est fournie automatiquement à la fonction par Supabase : elle n'est jamais exposée au navigateur.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await userClient.rpc('delete_my_data');
  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) return json(500, { error: delError.message });
  return json(200, { ok: true });
});

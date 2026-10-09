// En-têtes CORS. En production, remplacez * par l'adresse de votre site via la variable ALLOWED_ORIGIN.
// Le navigateur refuse la réponse si l'origine de la page ne correspond pas à ALLOWED_ORIGIN.
export function corsHeaders(_origin: string | null): Record<string, string> {
  const allowed = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

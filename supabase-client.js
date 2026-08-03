// Inicializa o cliente Supabase a partir de supabase-config.js.
// Todos os outros scripts (auth.js, board.js, ducks.js, booking.js, photos.js)
// usam window.supabaseClient e window.isSupabaseConfigured() daqui.
(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = !!(
    cfg.url &&
    cfg.anonKey &&
    !cfg.url.includes('YOUR_SUPABASE_URL') &&
    !cfg.anonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );

  window.isSupabaseConfigured = function () {
    return configured;
  };

  if (configured && window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
  } else {
    window.supabaseClient = null;
    if (!configured) {
      console.warn(
        'Supabase ainda não está configurado. Preenche supabase-config.js com o URL e a anon key do teu projeto.'
      );
    }
  }
})();

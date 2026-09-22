// Reprova o release se as variáveis do Supabase estiverem faltando ou forem a chave errada.
// Elas são embutidas no app que todo mundo baixa: só a chave publishable (ou a anon legada) pode ir.
// Nunca imprime os valores.
const url = process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.VITE_SUPABASE_ANON_KEY ?? "";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!url.startsWith("https://")) {
  fail("O secret VITE_SUPABASE_URL está vazio ou não começa com https:// (esperado: https://<projeto>.supabase.co).");
}

if (!key) {
  fail('O secret VITE_SUPABASE_ANON_KEY está vazio: o release sairia com o modo "Banco de dados" indisponível.');
}

if (key.startsWith("sb_secret_")) {
  fail("VITE_SUPABASE_ANON_KEY é uma chave SECRET (sb_secret_...), que ignora o RLS. Use a publishable (sb_publishable_...).");
}

// Chave legada: um JWT cujo payload diz qual é o papel (anon ou service_role).
const parts = key.split(".");
if (parts.length === 3) {
  let role;
  try {
    role = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).role;
  } catch {
    // Não é um JWT legível; segue.
  }
  if (role === "service_role") {
    fail("VITE_SUPABASE_ANON_KEY é a chave service_role, que ignora o RLS. Use a publishable (sb_publishable_...).");
  }
}

console.log("Variáveis do Supabase presentes e sem chave privilegiada.");

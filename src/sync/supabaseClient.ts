import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente do Supabase. A sessão fica no localStorage do WebView, então a senha só é pedida
 * de novo ao entrar em outra máquina. `null` quando o app foi compilado sem as variáveis
 * (ver `.env.example`): nesse caso o modo "Banco de dados" fica indisponível.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isCloudAvailable = supabase !== null;

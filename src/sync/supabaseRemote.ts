import type { SupabaseClient } from "@supabase/supabase-js";
import type { Remote, Row } from "./engine";

/** O servidor do sync: as tabelas espelho do Supabase, acessadas com a sessão da pessoa (RLS filtra por user_id). */
export function createSupabaseRemote(client: SupabaseClient): Remote {
  return {
    async pull(table, since, limit) {
      let query = client
        .from(table)
        .select("*")
        .order("server_updated_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(limit);
      if (since?.id) {
        query = query.or(
          `server_updated_at.gt.${since.at},and(server_updated_at.eq.${since.at},id.gt.${since.id})`,
        );
      } else if (since) {
        query = query.gt("server_updated_at", since.at);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Row[];
    },

    async push(table, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },
  };
}

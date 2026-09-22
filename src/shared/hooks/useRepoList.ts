import { useCallback, useEffect, useState } from "react";
import { useSyncStore } from "../../sync/useSyncStore";

type RepoListState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: T[] };

/**
 * Carrega uma lista de um repositório e expõe loading/error/ready + reload.
 * Recarrega sozinho quando o sync traz dados novos de outro dispositivo.
 */
export function useRepoList<T>(fetcher: () => Promise<T[]>) {
  const [state, setState] = useState<RepoListState<T>>({ status: "loading" });
  const dataVersion = useSyncStore((s) => s.dataVersion);

  const reload = useCallback(() => {
    fetcher()
      .then((items) => setState({ status: "ready", items }))
      .catch(() => setState({ status: "error" }));
  }, [fetcher]);

  useEffect(reload, [reload, dataVersion]);

  return { state, reload };
}

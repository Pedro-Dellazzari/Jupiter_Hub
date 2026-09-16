import { useCallback, useEffect, useState } from "react";

type RepoListState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: T[] };

/** Carrega uma lista de um repositório e expõe loading/error/ready + reload. */
export function useRepoList<T>(fetcher: () => Promise<T[]>) {
  const [state, setState] = useState<RepoListState<T>>({ status: "loading" });

  const reload = useCallback(() => {
    fetcher()
      .then((items) => setState({ status: "ready", items }))
      .catch(() => setState({ status: "error" }));
  }, [fetcher]);

  useEffect(reload, [reload]);

  return { state, reload };
}

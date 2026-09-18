import { Hexagon } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { useRepoList } from "../../../shared/hooks/useRepoList";
import { spacesRepo } from "../../../db/repositories/spacesRepo";

export function SpacesRow() {
  const { state } = useRepoList(spacesRepo.listWithStats);
  if (state.status !== "ready" || state.items.length === 0) return null;

  return (
    <div className="flex items-center gap-4">
      {state.items.map((space) => (
        <Card
          key={space.id}
          className="flex flex-1 items-center gap-2.5 px-4 py-3.5 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
        >
          <div
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px]"
            style={{ backgroundColor: space.color ?? "#007aff" }}
          >
            <Hexagon className="size-3.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-(--color-ink)">{space.name}</p>
            <p className="text-[11px] text-(--color-ink-muted)">
              {space.task_count} {space.task_count === 1 ? "tarefa" : "tarefas"} · {space.project_count}{" "}
              {space.project_count === 1 ? "projeto" : "projetos"}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

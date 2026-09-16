import { Hexagon } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { spaces } from "../mockData";

export function SpacesRow() {
  return (
    <div className="flex items-center gap-4">
      {spaces.map((space) => (
        <Card key={space.id} className="flex flex-1 items-center gap-2.5 px-4 py-3.5 shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]">
          <div
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px]"
            style={{ backgroundColor: space.color }}
          >
            <Hexagon className="size-3.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-(--color-ink)">{space.name}</p>
            <p className="text-[11px] text-(--color-ink-muted)">{space.meta}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

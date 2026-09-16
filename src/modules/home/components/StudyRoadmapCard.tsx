import { GraduationCap } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { studyRoadmap } from "../mockData";

export function StudyRoadmapCard() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-1.5 text-[14px] font-semibold text-(--color-ink)">
        <GraduationCap className="size-3.5" strokeWidth={2} />
        <span>Roadmap de estudos</span>
      </div>
      <p className="text-[13px] text-(--color-ink-muted)">
        Próximo passo: {studyRoadmap.nextStep}
      </p>
      <ProgressBar value={studyRoadmap.progress} className="h-2" />
    </Card>
  );
}

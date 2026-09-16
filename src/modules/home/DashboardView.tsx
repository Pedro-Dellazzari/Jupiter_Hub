import { TopBar } from "./components/TopBar";
import { StatCards } from "./components/StatCards";
import { ProjectsSection } from "./components/ProjectsSection";
import { SpacesRow } from "./components/SpacesRow";
import { StudyRoadmapCard } from "./components/StudyRoadmapCard";

export function DashboardView() {
  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="flex flex-col gap-6">
        <TopBar name="Pedro" />
        <StatCards />
        <ProjectsSection />
        <SpacesRow />
        <StudyRoadmapCard />
      </div>
    </div>
  );
}

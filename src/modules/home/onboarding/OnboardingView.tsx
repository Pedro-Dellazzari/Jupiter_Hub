import { useEffect, useState } from "react";
import { Hexagon, CheckSquare, NotebookText, Calendar, Repeat } from "lucide-react";
import { spacesRepo } from "../../../db/repositories/spacesRepo";
import { tasksRepo } from "../../../db/repositories/tasksRepo";
import { notebooksRepo } from "../../../db/repositories/notebooksRepo";
import { notesRepo } from "../../../db/repositories/notesRepo";
import { habitsRepo } from "../../../db/repositories/habitsRepo";
import { projectsRepo } from "../../../db/repositories/projectsRepo";
import { QuickCreateDialog } from "../../../shared/ui/QuickCreateDialog";
import { Dialog } from "../../../shared/ui/Dialog";
import { OnboardingHero } from "./OnboardingHero";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingChecklist, type ChecklistStep } from "./OnboardingChecklist";
import { OnboardingEmptyRow } from "./OnboardingEmptyRow";

type DialogKind = "space" | "task" | "note" | "habit" | "project" | "calendar" | null;

export function OnboardingView({ name, onSpaceCreated }: { name: string; onSpaceCreated: () => void }) {
  const [hasTask, setHasTask] = useState(false);
  const [hasNote, setHasNote] = useState(false);
  const [hasHabit, setHasHabit] = useState(false);
  const [openDialog, setOpenDialog] = useState<DialogKind>(null);

  useEffect(() => {
    Promise.all([tasksRepo.list(), notesRepo.list(), habitsRepo.list()])
      .then(([tasks, notes, habits]) => {
        setHasTask(tasks.length > 0);
        setHasNote(notes.length > 0);
        setHasHabit(habits.length > 0);
      })
      .catch(() => {
        /* mantém checklist como "não concluído" se a leitura falhar */
      });
  }, []);

  async function createNote(title: string) {
    let notebooks = await notebooksRepo.list();
    if (notebooks.length === 0) {
      await notebooksRepo.create({ name: "Minhas notas" });
      notebooks = await notebooksRepo.list();
    }
    await notesRepo.create({ notebook_id: notebooks[0].id, title });
    setHasNote(true);
  }

  const steps: ChecklistStep[] = [
    {
      id: "space",
      icon: Hexagon,
      title: "Criar seu primeiro Espaço",
      description: "Organize tudo por contexto — Trabalho, Estudos, Projetos Pessoais.",
      ctaLabel: "Criar Espaço",
      done: false,
      onAction: () => setOpenDialog("space"),
    },
    {
      id: "task",
      icon: CheckSquare,
      title: "Adicionar uma tarefa",
      description: "Comece com algo simples que você precisa fazer hoje.",
      ctaLabel: "Nova tarefa",
      done: hasTask,
      onAction: () => setOpenDialog("task"),
    },
    {
      id: "note",
      icon: NotebookText,
      title: "Criar um Caderno",
      description: "Sua primeira nota, com links internos estilo Obsidian.",
      ctaLabel: "Nova nota",
      done: hasNote,
      onAction: () => setOpenDialog("note"),
    },
    {
      id: "calendar",
      icon: Calendar,
      title: "Conectar seu Calendário",
      description: "Sincronize com Gmail ou Outlook pra ver tudo num só lugar.",
      ctaLabel: "Conectar",
      done: false,
      onAction: () => setOpenDialog("calendar"),
    },
    {
      id: "habit",
      icon: Repeat,
      title: "Criar um Hábito",
      description: "Comece a acompanhar algo que você quer manter todo dia.",
      ctaLabel: "Novo hábito",
      done: hasHabit,
      onAction: () => setOpenDialog("habit"),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="flex flex-col gap-6">
        <OnboardingHero name={name} />
        <OnboardingProgress done={doneCount} total={steps.length} />
        <OnboardingChecklist steps={steps} />
        <OnboardingEmptyRow
          onCreateSpace={() => setOpenDialog("space")}
          onCreateProject={() => setOpenDialog("project")}
          onConnectCalendar={() => setOpenDialog("calendar")}
        />
      </div>

      <QuickCreateDialog
        open={openDialog === "space"}
        onOpenChange={(open) => setOpenDialog(open ? "space" : null)}
        title="Criar Espaço"
        description="Espaços organizam suas tarefas, projetos e notas por contexto."
        placeholder="Ex: Trabalho"
        submitLabel="Criar Espaço"
        onSubmit={async (name) => {
          await spacesRepo.create({ name });
          onSpaceCreated();
        }}
      />

      <QuickCreateDialog
        open={openDialog === "task"}
        onOpenChange={(open) => setOpenDialog(open ? "task" : null)}
        title="Nova tarefa"
        placeholder="O que você precisa fazer hoje?"
        submitLabel="Adicionar tarefa"
        onSubmit={async (title) => {
          await tasksRepo.create({ title });
          setHasTask(true);
        }}
      />

      <QuickCreateDialog
        open={openDialog === "note"}
        onOpenChange={(open) => setOpenDialog(open ? "note" : null)}
        title="Nova nota"
        description="Vai para um caderno padrão — você pode reorganizar depois."
        placeholder="Título da nota"
        submitLabel="Criar nota"
        onSubmit={createNote}
      />

      <QuickCreateDialog
        open={openDialog === "habit"}
        onOpenChange={(open) => setOpenDialog(open ? "habit" : null)}
        title="Novo hábito"
        placeholder="O que você quer manter todo dia?"
        submitLabel="Criar hábito"
        onSubmit={async (name) => {
          await habitsRepo.create({ name });
          setHasHabit(true);
        }}
      />

      <QuickCreateDialog
        open={openDialog === "project"}
        onOpenChange={(open) => setOpenDialog(open ? "project" : null)}
        title="Criar projeto"
        description="Você pode vincular a um Espaço depois, quando criar um."
        placeholder="Nome do projeto"
        submitLabel="Criar projeto"
        onSubmit={async (name) => {
          await projectsRepo.create({ name });
        }}
      />

      <Dialog
        open={openDialog === "calendar"}
        onOpenChange={(open) => setOpenDialog(open ? "calendar" : null)}
        title="Conectar calendário"
        description="Integração com Google Calendar e Outlook ainda não está disponível nesta versão do Hub."
      >
        <button
          onClick={() => setOpenDialog(null)}
          className="w-full rounded-lg bg-(--color-fill) py-2 text-[13px] font-semibold text-(--color-ink)"
        >
          Entendi
        </button>
      </Dialog>
    </div>
  );
}

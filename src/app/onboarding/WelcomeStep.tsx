import { LogoMark } from "../../shared/ui/Logo";
import { PrimaryButton } from "./parts";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-7 text-center">
      <LogoMark size={72} />
      <div className="flex flex-col gap-2">
        <h1 className="font-brand text-[28px] font-semibold tracking-[-0.03em] text-(--color-ink)">
          Bem-vindo ao Jupiter Hub
        </h1>
        <p className="text-[14px] text-(--color-ink-muted)">
          Tarefas, cadernos, projetos e hábitos num só lugar. Vamos configurar o seu espaço em poucos passos.
        </p>
      </div>
      <PrimaryButton onClick={onNext} autoFocus>
        Começar
      </PrimaryButton>
    </div>
  );
}

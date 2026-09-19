import { Contrast } from "lucide-react";

export function OnboardingHero({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex size-12 items-center justify-center rounded-[14px] bg-(--color-accent)">
        <Contrast className="size-5 text-(--color-accent-ink)" strokeWidth={2} />
      </div>
      <h1 className="text-[26px] font-bold tracking-[-0.5px] text-(--color-ink)">
        Bem-vindo ao seu Hub, {name}
      </h1>
      <p className="max-w-[560px] text-[14px] leading-[1.45] text-(--color-ink-muted)">
        Seu espaço está vazio por enquanto — isso é bom, quer dizer que fica do seu jeito. Vamos
        configurar os primeiros passos?
      </p>
    </div>
  );
}

import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

const SUGGESTIONS = ["Quais são minhas pendências?", "Resuma meu dia", "O que venceu esta semana?"];

export default function Chat() {
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setNotice(true);
  }

  return (
    <div className="flex h-full items-center justify-center px-10 py-8">
      <div className="flex w-[534px] flex-col items-center gap-5">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-(--color-accent)">
          <Sparkles className="size-6 text-(--color-accent-ink)" strokeWidth={2} />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.4px] text-(--color-ink)">
          Como posso ajudar hoje, Pedro?
        </h1>
        <p className="w-[380px] text-center text-[13px] text-(--color-ink-muted)">
          Pergunte sobre suas tarefas, projetos, hábitos ou peça um resumo do seu dia.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center gap-2.5 rounded-2xl py-3.5 pr-3.5 pl-4.5 shadow-[0px_2px_14px_0px_rgba(0,0,0,0.08)]"
        >
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setNotice(false);
            }}
            placeholder="Pergunte algo…"
            className="flex-1 text-[14px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/60"
          />
          <button
            type="submit"
            className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-(--color-accent)"
          >
            <ArrowUp className="size-3.5 text-(--color-accent-ink)" strokeWidth={2.5} />
          </button>
        </form>

        {notice && (
          <p className="text-[12px] text-(--color-ink-muted)">
            Chat com IA ainda não está conectado a um modelo nesta versão.
          </p>
        )}

        <div className="flex flex-wrap items-start justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setValue(s)}
              className="rounded-[20px] bg-(--color-fill) px-3.5 py-2 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-track)"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

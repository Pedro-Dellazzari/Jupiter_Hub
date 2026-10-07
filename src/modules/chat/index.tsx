import { useEffect, useRef, useState } from "react";
import { ArrowUp, Settings2, Sparkles, Square, SquarePen } from "lucide-react";
import { motion } from "motion/react";
import { useAccountStore, useFirstName } from "../../app/store/useAccountStore";
import { springs } from "../../shared/motion/springs";
import { cn } from "../../shared/utils/cn";
import { ANTHROPIC_MODELS } from "./ai/anthropic";
import { AiSettingsDialog } from "./components/AiSettingsDialog";
import { useChatStore, type ChatMessage } from "./useChatStore";

const SUGGESTIONS = [
  "Quais são minhas pendências?",
  "Como estão meus projetos?",
  "Como estão meus hábitos esta semana?",
  "O que tenho anotado nos cadernos?",
];

const ICON_BUTTON_CLASS =
  "flex size-8 items-center justify-center rounded-lg text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)";

export default function Chat() {
  const firstName = useFirstName();
  const userName = useAccountStore((s) => s.name);
  const settings = useChatStore((s) => s.settings);
  const loadSettings = useChatStore((s) => s.loadSettings);
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const activity = useChatStore((s) => s.activity);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const clear = useChatStore((s) => s.clear);
  const [value, setValue] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings) loadSettings().catch(() => undefined);
  }, [settings, loadSettings]);

  // Acompanha a resposta conforme ela chega.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, activity]);

  if (!settings) return null;

  const connected = Boolean(settings.keys[settings.provider] && settings.models[settings.provider]);
  const streaming = status === "streaming";
  const modelId = settings.models[settings.provider];
  const modelLabel = ANTHROPIC_MODELS.find((m) => m.value === modelId)?.label ?? modelId;

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (!connected) {
      setSettingsOpen(true);
      return;
    }
    setValue("");
    send(trimmed, userName);
  }

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="flex w-full items-center gap-2.5 rounded-2xl bg-(--color-surface-elevated) py-3.5 pr-3.5 pl-4.5 shadow-[0px_2px_14px_0px_rgba(0,0,0,0.08)]"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pergunte algo…"
        autoFocus
        className="min-w-0 flex-1 bg-transparent text-[14px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/60"
      />
      {streaming ? (
        <button
          type="button"
          onClick={stop}
          className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-(--color-ink) text-(--color-surface-elevated)"
          title="Parar resposta"
        >
          <Square className="size-2.5 fill-current" strokeWidth={0} />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-(--color-accent) disabled:opacity-40"
          title="Enviar"
        >
          <ArrowUp className="size-3.5 text-(--color-accent-ink)" strokeWidth={2.5} />
        </button>
      )}
    </form>
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute top-5 right-6 z-10 flex items-center gap-1">
        {connected && <span className="mr-1 text-[12px] font-medium text-(--color-ink-muted)">{modelLabel}</span>}
        {messages.length > 0 && (
          <button type="button" onClick={clear} className={ICON_BUTTON_CLASS} title="Nova conversa">
            <SquarePen className="size-4" strokeWidth={1.75} />
          </button>
        )}
        <button type="button" onClick={() => setSettingsOpen(true)} className={ICON_BUTTON_CLASS} title="Integração com IA">
          <Settings2 className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-10 py-8">
          <div className="flex w-[534px] flex-col items-center gap-5">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-(--color-accent)">
              <Sparkles className="size-6 text-(--color-accent-ink)" strokeWidth={2} />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.4px] text-(--color-ink)">
              Como posso ajudar hoje, {firstName}?
            </h1>
            <p className="w-[380px] text-center text-[13px] text-(--color-ink-muted)">
              Pergunte sobre suas tarefas, projetos, cadernos e hábitos: pendências, prazos, anotações e consistência.
            </p>

            {connected ? (
              <>
                {composer}
                <div className="flex flex-wrap items-start justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => submit(suggestion)}
                      className="rounded-[20px] bg-(--color-fill) px-3.5 py-2 text-[12px] font-medium text-(--color-ink-muted) hover:bg-(--color-track)"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="w-[380px] text-center text-[13px] text-(--color-ink-muted)">
                  Para começar, conecte uma chave de API do Claude ou da OpenAI.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  whileHover={{ scale: 1.03, transition: springs.snappy }}
                  whileTap={{ scale: 0.97, transition: springs.snappy }}
                  className="rounded-[10px] bg-(--color-accent) px-4 py-2.5 text-[13px] font-semibold text-(--color-accent-ink) hover:brightness-110"
                >
                  Conectar um modelo
                </motion.button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-16 pb-6">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  pending={streaming && index === messages.length - 1}
                  activity={streaming && index === messages.length - 1 ? activity : null}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              ))}
              <div ref={endRef} />
            </div>
          </div>
          <div className="shrink-0 px-10 pb-6">
            <div className="mx-auto w-full max-w-[720px]">{composer}</div>
          </div>
        </>
      )}

      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function MessageBubble({
  message,
  pending,
  activity,
  onOpenSettings,
}: {
  message: ChatMessage;
  /** É a resposta que está sendo gerada agora. */
  pending: boolean;
  activity: string | null;
  onOpenSettings: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-(--color-accent)/12 px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-(--color-ink)">
        {message.text}
      </div>
    );
  }

  const waiting = pending && !message.text;
  return (
    <div className="flex flex-col gap-2 self-start">
      {message.text && (
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-(--color-ink)">{message.text}</p>
      )}
      {(waiting || activity) && (
        <span className="flex items-center gap-2 text-[13px] text-(--color-ink-muted)">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="size-2 rounded-full bg-(--color-accent)"
          />
          {activity ?? "Pensando…"}
        </span>
      )}
      {!pending && !message.text && !message.error && (
        <span className="text-[13px] text-(--color-ink-muted)">Resposta interrompida.</span>
      )}
      {message.error && (
        <div className={cn("flex flex-col items-start gap-1.5 text-[13px] text-(--color-danger)")}>
          <span>{message.error}</span>
          {message.authError && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="font-semibold text-(--color-accent-text) hover:underline"
            >
              Abrir configurações da IA
            </button>
          )}
        </div>
      )}
    </div>
  );
}

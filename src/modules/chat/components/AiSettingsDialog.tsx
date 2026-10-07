import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { Dialog } from "../../../shared/ui/Dialog";
import { SelectMenu } from "../../../shared/ui/SelectMenu";
import { cn } from "../../../shared/utils/cn";
import { ANTHROPIC_MODELS, testAnthropicKey } from "../ai/anthropic";
import { listOpenAiModels } from "../ai/openai";
import { AiError, type AiProvider } from "../ai/types";
import { useChatStore, type AiSettings } from "../useChatStore";

const PROVIDERS: { value: AiProvider; label: string; keyHint: string }[] = [
  { value: "anthropic", label: "Claude (Anthropic)", keyHint: "sk-ant-…" },
  { value: "openai", label: "OpenAI", keyHint: "sk-…" },
];

const FIELD_LABEL_CLASS = "mb-1.5 block text-[12px] font-medium text-(--color-ink-muted)";

type TestState = { status: "idle" } | { status: "testing" } | { status: "ok" } | { status: "error"; message: string };

/** Integração com IA: provedor, chave e modelo. A chave fica só neste dispositivo. */
export function AiSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const saved = useChatStore((s) => s.settings);
  const saveSettings = useChatStore((s) => s.saveSettings);
  const [draft, setDraft] = useState<AiSettings | null>(saved);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  /** Modelos de conversa que a chave da OpenAI enxerga (vem da API ao testar a conexão). */
  const [openAiModels, setOpenAiModels] = useState<string[]>([]);

  // Cada abertura parte do que está salvo.
  useEffect(() => {
    if (open) {
      setDraft(saved);
      setShowKey(false);
      setTest({ status: "idle" });
    }
  }, [open, saved]);

  if (!draft) return null;

  const provider = draft.provider;
  const apiKey = draft.keys[provider].trim();
  const model = draft.models[provider];
  const modelOptions =
    provider === "anthropic"
      ? ANTHROPIC_MODELS
      : [...new Set([model, ...openAiModels].filter(Boolean))].map((id) => ({ value: id, label: id }));

  function update(patch: Partial<AiSettings>) {
    setDraft((current) => current && { ...current, ...patch });
    setTest({ status: "idle" });
  }

  async function handleTest() {
    if (!draft || !apiKey) return;
    setTest({ status: "testing" });
    try {
      if (provider === "anthropic") {
        await testAnthropicKey(apiKey);
      } else {
        const models = await listOpenAiModels(apiKey);
        setOpenAiModels(models);
        // Sem modelo escolhido ainda: sugere o mais recente que a chave enxerga.
        if (!draft.models.openai && models[0]) {
          setDraft((current) => current && { ...current, models: { ...current.models, openai: models[0] } });
        }
      }
      setTest({ status: "ok" });
    } catch (err) {
      setTest({
        status: "error",
        message: err instanceof AiError ? err.message : "Não foi possível testar a conexão.",
      });
    }
  }

  async function handleSave() {
    if (!draft) return;
    await saveSettings({ ...draft, keys: { ...draft.keys, [provider]: apiKey } });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Integração com IA"
      description="Conecte o Chat com IA à API do provedor de sua escolha."
    >
      <div className="flex flex-col gap-4">
        <div>
          <span className={FIELD_LABEL_CLASS}>Provedor</span>
          <div className="flex gap-0.5 rounded-lg bg-(--color-fill) p-0.5">
            {PROVIDERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ provider: option.value })}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-[12px] font-semibold",
                  provider === option.value
                    ? "bg-(--color-surface-elevated) text-(--color-ink) shadow-[0px_1px_8px_0px_rgba(0,0,0,0.05)]"
                    : "text-(--color-ink-muted) hover:text-(--color-ink)",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ai-api-key" className={FIELD_LABEL_CLASS}>
            Chave da API
          </label>
          <div className="flex items-center gap-1.5 rounded-lg border border-(--color-divider) bg-(--color-surface) pr-1.5 focus-within:border-(--color-accent)">
            <input
              id="ai-api-key"
              type={showKey ? "text" : "password"}
              value={draft.keys[provider]}
              onChange={(e) => update({ keys: { ...draft.keys, [provider]: e.target.value } })}
              placeholder={PROVIDERS.find((p) => p.value === provider)?.keyHint}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] text-(--color-ink) outline-none placeholder:text-(--color-ink-muted)/60"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-(--color-ink-muted) hover:bg-(--color-fill) hover:text-(--color-ink)"
              title={showKey ? "Ocultar chave" : "Mostrar chave"}
            >
              {showKey ? <EyeOff className="size-3.5" strokeWidth={2} /> : <Eye className="size-3.5" strokeWidth={2} />}
            </button>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-(--color-ink-muted)">
            A chave fica salva só neste dispositivo, no banco local, e não entra na sincronização. Ela é enviada apenas
            ao provedor escolhido.
          </p>
        </div>

        <div>
          <span className={FIELD_LABEL_CLASS}>Modelo</span>
          <SelectMenu
            value={model}
            options={modelOptions}
            onChange={(value) => update({ models: { ...draft.models, [provider]: value } })}
            emptyLabel="Escolher modelo"
          />
          {provider === "openai" && openAiModels.length === 0 && (
            <p className="mt-1.5 text-[12px] text-(--color-ink-muted)">
              Teste a conexão para carregar os modelos disponíveis para a sua chave.
            </p>
          )}
        </div>

        {test.status === "ok" && (
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#1f8a5b]">
            <Check className="size-3.5" strokeWidth={2.5} />
            Conectado — a chave foi aceita.
          </p>
        )}
        {test.status === "error" && (
          <p className="flex items-start gap-1.5 text-[12px] font-medium text-(--color-danger)">
            <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={2.5} />
            {test.message}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={!apiKey || test.status === "testing"}
            className="flex items-center gap-1.5 rounded-lg bg-(--color-fill) px-3.5 py-2 text-[12px] font-semibold text-(--color-ink) hover:bg-(--color-track) disabled:opacity-50"
          >
            {test.status === "testing" && <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.5} />}
            Testar conexão
          </button>
          {draft.keys[provider] && (
            <button
              type="button"
              onClick={() => update({ keys: { ...draft.keys, [provider]: "" } })}
              className="px-2 py-2 text-[12px] font-semibold text-(--color-danger) hover:underline"
            >
              Remover chave
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="ml-auto rounded-lg bg-(--color-accent) px-4 py-2 text-[12px] font-semibold text-(--color-accent-ink) hover:brightness-110"
          >
            Salvar
          </button>
        </div>
      </div>
    </Dialog>
  );
}

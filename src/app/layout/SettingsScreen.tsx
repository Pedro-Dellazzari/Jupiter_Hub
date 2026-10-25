import { useEffect, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { CalendarDays, ChevronLeft, ChevronRight, Database, Palette, Sparkles, type LucideIcon } from "lucide-react";
import { AiSettingsDialog } from "../../modules/chat/components/AiSettingsDialog";
import { ANTHROPIC_MODELS } from "../../modules/chat/ai/anthropic";
import { useChatStore } from "../../modules/chat/useChatStore";
import { CalendarSourcesDialog } from "../../modules/calendar/components/CalendarSourcesDialog";
import { useCalendarStore } from "../../modules/calendar/useCalendarStore";
import { useBackHandler } from "../../shared/hooks/useBackHandler";
import { Card } from "../../shared/ui/Card";
import { cn } from "../../shared/utils/cn";
import { useAccountStore } from "../store/useAccountStore";
import { useThemeStore, type Theme } from "../store/useThemeStore";
import { useSyncStore } from "../../sync/useSyncStore";
import { AccountAvatar } from "./MobileNav";
import { AccountStatusLabel } from "./MoreScreen";

type Page = "list" | "appearance" | "data";

const THEME_OPTIONS: { value: Theme | null; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: null, label: "Sistema" },
];

/** Configurações do app mobile: conta, calendários, IA, aparência e dados. */
export function SettingsScreen() {
  const [page, setPage] = useState<Page>("list");
  const [calendarsOpen, setCalendarsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  useBackHandler(page !== "list", () => setPage("list"));

  if (page === "appearance") return <AppearancePage onBack={() => setPage("list")} />;
  if (page === "data") return <DataPage onBack={() => setPage("list")} />;

  return (
    <div className="h-full overflow-y-auto px-5 pt-4 pb-6 *:mx-auto *:max-w-[640px]">
      <h1 className="text-[28px] font-bold tracking-[-0.5px] text-(--color-ink)">Configurações</h1>
      <p className="mb-5 text-[14px] text-(--color-ink-muted)">Calendários, IA, aparência e dados</p>

      <AccountCard />

      <Card className="mb-4 flex flex-col divide-y divide-(--color-divider) px-4">
        <CalendarsRow onClick={() => setCalendarsOpen(true)} />
        <AiRow onClick={() => setAiOpen(true)} />
        <AppearanceRow onClick={() => setPage("appearance")} />
        <SettingsRow icon={Database} title="Dados e backup" subtitle="Banco local neste dispositivo" onClick={() => setPage("data")} />
      </Card>

      <VersionCard />

      <CalendarSourcesDialog
        open={calendarsOpen}
        onOpenChange={setCalendarsOpen}
        onSync={() => {
          const start = new Date();
          start.setDate(1);
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
          void useCalendarStore.getState().syncRange(start, end, { force: true });
        }}
      />
      <AiSettingsDialog open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
}

function AccountCard() {
  const name = useAccountStore((s) => s.name);
  const mode = useAccountStore((s) => s.mode);
  const needsSignIn = useSyncStore((s) => s.needsSignIn);
  const setSignInDialogOpen = useSyncStore((s) => s.setSignInDialogOpen);
  const sync = useSyncStore((s) => s.sync);

  return (
    <Card className="mb-4 px-4">
      <button
        type="button"
        onClick={() => (mode !== "cloud" ? undefined : needsSignIn ? setSignInDialogOpen(true) : void sync())}
        className="flex w-full items-center gap-3.5 py-4 text-left"
      >
        <AccountAvatar name={name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-(--color-ink)">{name}</p>
          <p className="flex items-center gap-1.5 truncate text-[13px] text-(--color-ink-muted)">
            {mode === "cloud" && (
              <span className={cn("size-1.5 shrink-0 rounded-full", needsSignIn ? "bg-(--color-danger)" : "bg-[#22a06b]")} />
            )}
            <AccountStatusLabel />
          </p>
        </div>
        {mode === "cloud" && (
          <span className="shrink-0 text-[13px] font-semibold text-(--color-accent-text)">
            {needsSignIn ? "Entrar" : "Sincronizar"}
          </span>
        )}
      </button>
    </Card>
  );
}

function CalendarsRow({ onClick }: { onClick: () => void }) {
  const sourceCount = useCalendarStore((s) => (s.account ? 1 : 0) + s.feeds.length);
  useEffect(() => {
    void useCalendarStore.getState().init();
  }, []);
  return (
    <SettingsRow
      icon={CalendarDays}
      title="Calendários"
      subtitle={sourceCount === 0 ? "Nenhuma fonte conectada" : sourceCount === 1 ? "1 fonte" : `${sourceCount} fontes`}
      onClick={onClick}
    />
  );
}

function AiRow({ onClick }: { onClick: () => void }) {
  const settings = useChatStore((s) => s.settings);
  const loadSettings = useChatStore((s) => s.loadSettings);
  useEffect(() => {
    if (!settings) loadSettings().catch(() => undefined);
  }, [settings, loadSettings]);

  const connected = Boolean(settings && settings.keys[settings.provider] && settings.models[settings.provider]);
  const modelId = settings?.models[settings.provider] ?? "";
  const modelLabel = ANTHROPIC_MODELS.find((m) => m.value === modelId)?.label ?? modelId;
  const providerLabel = settings?.provider === "openai" ? "OpenAI" : "Anthropic";

  return (
    <SettingsRow
      icon={Sparkles}
      title="Integração com IA"
      subtitle={connected ? `${providerLabel} · ${modelLabel}` : "Nenhuma chave configurada"}
      badge={
        connected ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#22a06b]/12 px-2 py-0.5 text-[11px] font-semibold text-[#1a7f53]">
            <span className="size-1.5 rounded-full bg-[#22a06b]" />
            Conectado
          </span>
        ) : undefined
      }
      onClick={onClick}
    />
  );
}

function AppearanceRow({ onClick }: { onClick: () => void }) {
  const preference = useThemeStore((s) => s.preference);
  const label = THEME_OPTIONS.find((o) => o.value === preference)?.label ?? "Sistema";
  return <SettingsRow icon={Palette} title="Aparência" subtitle={`Tema: ${label}`} onClick={onClick} />;
}

function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 py-3.5 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-(--color-fill) text-(--color-ink-muted)">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-(--color-ink)">{title}</p>
        <p className="truncate text-[12px] text-(--color-ink-muted)">{subtitle}</p>
      </div>
      {badge}
      <ChevronRight className="size-4 shrink-0 text-(--color-ink-muted)" strokeWidth={2} />
    </button>
  );
}

function VersionCard() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);
  return (
    <Card className="px-4 py-3.5">
      <p className="text-[14px] text-(--color-ink)">Jupiter Hub</p>
      <p className="text-[12px] text-(--color-ink-muted)">
        {version ? `Versão ${version}` : "Versão instalada"} · para atualizar, instale o APK novo
      </p>
    </Card>
  );
}

function SubPage({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-5 pt-3 pb-6 *:mx-auto *:max-w-[640px]">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-3 flex items-center gap-0.5 text-[15px] font-medium text-(--color-accent-text)"
      >
        <ChevronLeft className="size-5" strokeWidth={2} />
        Configurações
      </button>
      <h1 className="text-[28px] font-bold tracking-[-0.5px] text-(--color-ink)">{title}</h1>
      <p className="mb-5 text-[14px] text-(--color-ink-muted)">{subtitle}</p>
      {children}
    </div>
  );
}

function AppearancePage({ onBack }: { onBack: () => void }) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <SubPage title="Aparência" subtitle="Tema da interface" onBack={onBack}>
      <Card className="p-4">
        <p className="mb-3 text-[13px] text-(--color-ink-muted)">Tema</p>
        <div className="grid grid-cols-3 gap-2.5">
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === preference;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => setPreference(option.value)}
                className={cn(
                  "flex flex-col gap-2.5 rounded-xl border-2 p-2.5 text-left",
                  selected ? "border-(--color-accent) bg-(--color-accent)/8" : "border-(--color-divider)",
                )}
              >
                <ThemePreview theme={option.value} />
                <span className="flex items-center justify-between text-[13px] font-semibold text-(--color-ink)">
                  {option.label}
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full border-2",
                      selected ? "border-(--color-accent)" : "border-(--color-ink-muted)/40",
                    )}
                  >
                    {selected && <span className="size-2 rounded-full bg-(--color-accent)" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </SubPage>
  );
}

/** Miniatura de tela: fundo claro, escuro ou metade de cada (Sistema). */
function ThemePreview({ theme }: { theme: Theme | null }) {
  const pane = (dark: boolean) => (
    <div className={cn("flex flex-1 flex-col gap-1 p-1.5", dark ? "bg-[#1d1d1f]" : "bg-[#f2f2f4]")}>
      <span className={cn("h-1 w-3/4 rounded-full", dark ? "bg-white/30" : "bg-black/15")} />
      <span className={cn("h-1 w-1/2 rounded-full", dark ? "bg-white/20" : "bg-black/10")} />
      <span className="mt-auto h-1.5 w-1/3 rounded-full bg-(--color-accent)" />
    </div>
  );
  return (
    <div className="flex h-12 overflow-hidden rounded-lg">
      {theme === null ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(theme === "dark")
      )}
    </div>
  );
}

function DataPage({ onBack }: { onBack: () => void }) {
  const mode = useAccountStore((s) => s.mode);
  return (
    <SubPage
      title="Dados e backup"
      subtitle={
        mode === "cloud"
          ? "Seus dados ficam num banco SQLite neste dispositivo e sincronizam com a sua conta."
          : "Seus dados ficam num banco SQLite neste dispositivo e não saem dele."
      }
      onBack={onBack}
    >
      <Card className="flex flex-col gap-2 p-4">
        <p className="text-[13px] text-(--color-ink-muted)">Local do banco de dados</p>
        <p className="rounded-lg bg-(--color-fill) px-3 py-2.5 text-[14px] text-(--color-ink)">
          Armazenamento interno do app · hub.db
        </p>
        <p className="text-[12px] text-(--color-ink-muted)">
          {mode === "cloud"
            ? "Modo Banco de dados: o que você faz aqui aparece nos outros dispositivos da conta."
            : "Modo Dados locais: desinstalar o app apaga os dados deste aparelho."}
        </p>
      </Card>
    </SubPage>
  );
}

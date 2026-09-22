import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { AccountAuthError, signIn, signUp } from "../../sync/auth";
import { useAccountStore, type AccountMode } from "../store/useAccountStore";
import { BackButton, Field, PasswordField, PrimaryButton, StepHeader } from "./parts";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 6;

export function AccountStep({ mode, onBack }: { mode: AccountMode; onBack: () => void }) {
  return mode === "local" ? <LocalForm onBack={onBack} /> : <CloudForm onBack={onBack} />;
}

/** Modo local: o app só precisa saber como chamar a pessoa. */
function LocalForm({ onBack }: { onBack: () => void }) {
  const complete = useAccountStore((s) => s.complete);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await complete("local", trimmed);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <BackButton onClick={onBack} />
      <StepHeader title="Como podemos te chamar?" description="Seus dados ficam guardados só neste computador." />
      <Field
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Seu nome"
        autoComplete="name"
        autoFocus
      />
      {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
      <PrimaryButton type="submit" disabled={!name.trim() || submitting}>
        {submitting ? "Salvando…" : "Começar"}
      </PrimaryButton>
    </form>
  );
}

/** Modo nuvem: cria a conta (nome, e-mail e senha) ou, se o e-mail já existir, vira "entrar". */
function CloudForm({ onBack }: { onBack: () => void }) {
  const complete = useAccountStore((s) => s.complete);
  const [flow, setFlow] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isSignup = flow === "signup";
  const canSubmit = isSignup
    ? name.trim() !== "" && EMAIL_PATTERN.test(email.trim()) && password.length >= MIN_PASSWORD_LENGTH
    : EMAIL_PATTERN.test(email.trim()) && password !== "";

  // Quando o cadastro esbarra num e-mail existente, o foco vai direto para a senha.
  useEffect(() => {
    if (notice) passwordRef.current?.focus();
  }, [notice]);

  function switchFlow() {
    setFlow(isSignup ? "signin" : "signup");
    setPassword("");
    setNotice(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const account = isSignup
        ? await signUp({ name: name.trim(), email, password })
        : await signIn({ email, password });
      await complete("cloud", account.name);
    } catch (err) {
      if (err instanceof AccountAuthError && err.emailTaken && isSignup) {
        setFlow("signin");
        setPassword("");
        setNotice("Este e-mail já tem uma conta. Digite a senha dela para entrar.");
      } else {
        setError(err instanceof AccountAuthError ? err.message : "Não foi possível salvar. Tente novamente.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <BackButton onClick={onBack} />
      <StepHeader
        title={isSignup ? "Crie sua conta" : "Entrar na sua conta"}
        description={
          isSignup
            ? "Use o mesmo e-mail e senha para entrar em outros computadores e no celular."
            : "Entre com o e-mail e a senha que você cadastrou."
        }
      />

      <div className="flex flex-col gap-4">
        {isSignup && (
          <Field
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            autoFocus
          />
        )}
        <Field
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          autoFocus={!isSignup && !notice}
        />
        <PasswordField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSignup ? `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres` : "Sua senha"}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
      </div>

      <p className="flex gap-2 rounded-lg bg-(--color-fill) p-3 text-[12px] leading-snug text-(--color-ink-muted)">
        <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} />
        <span>
          A senha só será pedida novamente se você entrar com este e-mail em outra máquina. Neste computador, você
          continua conectado.
        </span>
      </p>

      {notice && <p className="text-[13px] text-(--color-accent-text)">{notice}</p>}
      {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}

      <div className="flex flex-col gap-3">
        <PrimaryButton type="submit" disabled={!canSubmit || submitting}>
          {submitting ? (isSignup ? "Criando conta…" : "Entrando…") : isSignup ? "Criar conta" : "Entrar"}
        </PrimaryButton>
        <button
          type="button"
          onClick={switchFlow}
          className="text-[13px] text-(--color-ink-muted) hover:text-(--color-ink)"
        >
          {isSignup ? "Já tenho conta" : "Criar uma conta"}
        </button>
      </div>
    </form>
  );
}

import { useRef, useState } from "react";
import { AccountAuthError, signIn } from "../../sync/auth";
import { useSyncStore } from "../../sync/useSyncStore";
import { Dialog } from "../../shared/ui/Dialog";
import { PasswordResetForm } from "../onboarding/PasswordResetForm";
import { Field, PasswordField, PrimaryButton } from "../onboarding/parts";

/**
 * Pede o login de novo quando o app está no modo "Banco de dados" mas sem sessão (ela expirou, ou o
 * banco local foi criado por outra instalação do app). Sem isso o sync fica parado em silêncio.
 */
export function SignInDialog() {
  const open = useSyncStore((s) => s.signInDialogOpen);
  const setOpen = useSyncStore((s) => s.setSignInDialogOpen);
  const signedIn = useSyncStore((s) => s.signedIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const canSubmit = email.trim() !== "" && password !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn({ email, password });
      setPassword("");
      signedIn();
    } catch (err) {
      setError(err instanceof AccountAuthError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) setOpen(next);
      }}
      title={resetting ? "Redefinir senha" : "Entre novamente"}
      description={
        resetting
          ? undefined
          : "A sincronização está parada porque este computador não está conectado à sua conta. Seus dados locais continuam aqui e serão enviados assim que você entrar."
      }
      initialFocusRef={emailRef}
    >
      {resetting ? (
        <PasswordResetForm
          initialEmail={email}
          onCancel={() => setResetting(false)}
          onDone={() => {
            setResetting(false);
            signedIn();
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            ref={emailRef}
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoComplete="email"
          />
          <PasswordField
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
          />
          {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}
          <PrimaryButton type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setResetting(true)}
            className="text-[13px] text-(--color-ink-muted) hover:text-(--color-ink)"
          >
            Esqueci minha senha
          </button>
        </form>
      )}
    </Dialog>
  );
}

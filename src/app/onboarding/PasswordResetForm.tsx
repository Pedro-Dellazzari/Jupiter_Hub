import { useState } from "react";
import {
  AccountAuthError,
  MIN_PASSWORD_LENGTH,
  requestPasswordReset,
  resetPassword,
  type CloudAccount,
} from "../../sync/auth";
import { Field, PasswordField, PrimaryButton } from "./parts";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const LINK_CLASS = "text-[13px] text-(--color-ink-muted) hover:text-(--color-ink) disabled:opacity-40";

type Props = {
  initialEmail?: string;
  onCancel?: () => void;
  /** A senha foi trocada e a sessão já está aberta. */
  onDone: (account: CloudAccount) => void | Promise<void>;
};

/** "Esqueci minha senha": pede o e-mail, envia um código e troca a senha com ele. */
export function PasswordResetForm({ initialEmail = "", onCancel, onDone }: Props) {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const canSubmit =
    step === "request" ? emailValid : code.trim() !== "" && password.length >= MIN_PASSWORD_LENGTH;

  async function run(action: () => Promise<void>) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof AccountAuthError ? err.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function sendCode(resend = false) {
    return run(async () => {
      await requestPasswordReset(email);
      setStep("confirm");
      if (resend) setNotice("Enviamos um novo código.");
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (step === "request") void sendCode();
    else void run(async () => onDone(await resetPassword({ email, code, password })));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-[13px] text-(--color-ink-muted)">
        {step === "request"
          ? "Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha."
          : `Se existir uma conta com ${email.trim().toLowerCase()}, o código chega em instantes. Confira também o spam.`}
      </p>

      {step === "request" ? (
        <Field
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          autoFocus
        />
      ) : (
        <>
          <Field
            label="Código recebido por e-mail"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
          />
          <PasswordField
            label="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
            autoComplete="new-password"
          />
        </>
      )}

      {notice && <p className="text-[13px] text-(--color-accent-text)">{notice}</p>}
      {error && <p className="text-[12px] text-(--color-danger)">{error}</p>}

      <PrimaryButton type="submit" disabled={!canSubmit || submitting}>
        {step === "request"
          ? submitting
            ? "Enviando…"
            : "Enviar código"
          : submitting
            ? "Salvando…"
            : "Salvar nova senha"}
      </PrimaryButton>

      {step === "confirm" && (
        <button type="button" onClick={() => void sendCode(true)} disabled={submitting} className={LINK_CLASS}>
          Reenviar código
        </button>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={submitting} className={LINK_CLASS}>
          Voltar para o login
        </button>
      )}
    </form>
  );
}

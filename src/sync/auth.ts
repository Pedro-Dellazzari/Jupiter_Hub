import type { AuthError, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

/** Erro já em português, pronto para a tela. `emailTaken` avisa que o fluxo deve virar "entrar". */
export class AccountAuthError extends Error {
  readonly emailTaken: boolean;

  constructor(message: string, emailTaken = false) {
    super(message);
    this.emailTaken = emailTaken;
  }
}

export type CloudAccount = { name: string; email: string };

export const MIN_PASSWORD_LENGTH = 6;

function toAccountError(error: AuthError): AccountAuthError {
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
      return new AccountAuthError("Este e-mail já tem uma conta.", true);
    case "invalid_credentials":
      return new AccountAuthError("E-mail ou senha incorretos.");
    case "weak_password":
      return new AccountAuthError("Senha muito fraca. Use pelo menos 6 caracteres.");
    case "same_password":
      return new AccountAuthError("A nova senha precisa ser diferente da anterior.");
    case "otp_expired":
    case "otp_disabled":
    case "validation_failed":
      return new AccountAuthError("Código inválido ou expirado. Confira o e-mail ou peça um novo código.");
    case "email_address_invalid":
      return new AccountAuthError("Esse e-mail não é válido.");
    case "signup_disabled":
      return new AccountAuthError("Novos cadastros estão desativados no servidor.");
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return new AccountAuthError("Muitas tentativas seguidas. Aguarde um pouco e tente de novo.");
  }
  if (error.status === 429) {
    return new AccountAuthError("Muitas tentativas seguidas. Aguarde um pouco e tente de novo.");
  }
  if (error.name === "AuthRetryableFetchError") {
    return new AccountAuthError("Sem conexão com o servidor. Verifique sua internet.");
  }
  return new AccountAuthError("Não foi possível concluir. Tente novamente.");
}

function client() {
  if (!supabase) {
    throw new AccountAuthError("O banco de dados na nuvem não está disponível nesta versão do app.");
  }
  return supabase;
}

function displayName(user: User, email: string) {
  const name: unknown = user.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name.trim() : email.split("@")[0];
}

/** Cria a conta (e-mail é o identificador único; o nome vai nos metadados do usuário) e já deixa a sessão aberta. */
export async function signUp(input: { name: string; email: string; password: string }): Promise<CloudAccount> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await client().auth.signUp({
    email,
    password: input.password,
    options: { data: { name: input.name } },
  });
  if (error) throw toAccountError(error);

  // Com "Confirm email" ligado o Supabase não erra para e-mail repetido: devolve um usuário sem identities.
  if (data.user?.identities?.length === 0) {
    throw new AccountAuthError("Este e-mail já tem uma conta.", true);
  }
  // Sem sessão = o projeto está exigindo confirmação por e-mail, que o fluxo do app não prevê.
  if (!data.session) {
    throw new AccountAuthError(
      'O Supabase está exigindo confirmação por e-mail. Desligue "Confirm email" em Authentication → Sign In / Providers → Email.',
    );
  }
  return { name: input.name, email };
}

export async function signIn(input: { email: string; password: string }): Promise<CloudAccount> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await client().auth.signInWithPassword({ email, password: input.password });
  if (error) throw toAccountError(error);
  return { name: displayName(data.user, email), email };
}

/**
 * Envia o e-mail de recuperação. O app é desktop e não tem para onde um link redirecionar, então a
 * redefinição usa o código do e-mail: o template "Reset Password" do Supabase precisa mostrar `{{ .Token }}`.
 * O Supabase não diz se o e-mail existe (de propósito), então isto só falha por rede ou limite de envio.
 */
export async function requestPasswordReset(emailInput: string): Promise<void> {
  const { error } = await client().auth.resetPasswordForEmail(emailInput.trim().toLowerCase());
  if (error) throw toAccountError(error);
}

/** Troca o código do e-mail por uma sessão e grava a nova senha; a pessoa já sai conectada. */
export async function resetPassword(input: { email: string; code: string; password: string }): Promise<CloudAccount> {
  const email = input.email.trim().toLowerCase();
  const auth = client().auth;

  // O código só vale uma vez: se ele já foi aceito e o que falhou foi gravar a senha, a sessão já existe.
  const { data: current } = await auth.getSession();
  if (current.session?.user.email?.toLowerCase() !== email) {
    const { error } = await auth.verifyOtp({ email, token: input.code.trim(), type: "recovery" });
    if (error) throw toAccountError(error);
  }

  const { data, error } = await auth.updateUser({ password: input.password });
  if (error) throw toAccountError(error);
  return { name: displayName(data.user, email), email };
}

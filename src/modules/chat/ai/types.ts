export type AiProvider = "anthropic" | "openai";

/** Uma fala já encerrada da conversa — só texto; chamadas de ferramenta vivem dentro de cada turno. */
export type ChatTurn = { role: "user" | "assistant"; text: string };

export type RunTurnParams = {
  apiKey: string;
  model: string;
  system: string;
  /** Conversa até aqui, terminando na pergunta atual do usuário. */
  history: ChatTurn[];
  /** Trecho de texto da resposta, conforme chega. */
  onText: (delta: string) => void;
  /** Avisa que o modelo pediu uma consulta aos dados (`null` quando ela termina). */
  onToolUse: (toolName: string | null) => void;
  signal: AbortSignal;
};

/** Erro já traduzido para uma mensagem que pode ser mostrada ao usuário. */
export class AiError extends Error {
  /** `auth` = chave inválida ou sem permissão: vale abrir as configurações. */
  kind: "auth" | "rate_limit" | "network" | "refusal" | "other";

  constructor(kind: AiError["kind"], message: string) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
  }
}

/** Limite de idas e vindas modelo ↔ ferramentas num único turno, para um laço não rodar sem fim. */
export const MAX_TOOL_ROUNDS = 8;

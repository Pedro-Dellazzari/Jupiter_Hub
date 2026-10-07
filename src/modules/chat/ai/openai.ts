import OpenAI from "openai";
import { AI_TOOLS, executeAiTool } from "./tools";
import { AiError, MAX_TOOL_ROUNDS, type RunTurnParams } from "./types";

/** Mesma justificativa do cliente da Anthropic: app desktop com a chave do próprio usuário. */
function createClient(apiKey: string) {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = AI_TOOLS.map((tool) => ({
  type: "function",
  function: { name: tool.name, description: tool.description, parameters: tool.parameters },
}));

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) {
    return new AiError("auth", "A chave da OpenAI foi recusada. Confira a chave nas configurações da IA.");
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new AiError("rate_limit", "Limite de uso (ou de crédito) da OpenAI atingido. Tente de novo em instantes.");
  }
  if (err instanceof OpenAI.NotFoundError) {
    return new AiError("other", "Esse modelo não está disponível para a sua chave. Escolha outro nas configurações.");
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new AiError("network", "Não foi possível falar com a OpenAI. Verifique sua conexão.");
  }
  if (err instanceof OpenAI.APIError) {
    return new AiError("other", `A OpenAI devolveu um erro (${err.status ?? "sem status"}): ${err.message}`);
  }
  return new AiError("other", "Algo deu errado ao gerar a resposta.");
}

type PendingToolCall = { id: string; name: string; arguments: string };

/** Um turno completo: envia a conversa, executa as ferramentas pedidas e repete até a resposta final. */
export async function runOpenAiTurn(params: RunTurnParams): Promise<void> {
  const client = createClient(params.apiKey);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: params.system },
    ...params.history.map((turn) => ({ role: turn.role, content: turn.text })),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await client.chat.completions.create(
        { model: params.model, messages, tools: TOOLS, stream: true },
        { signal: params.signal },
      );

      let text = "";
      let finishReason: string | null = null;
      // As chamadas de ferramenta chegam em pedaços, identificadas pelo índice.
      const calls: PendingToolCall[] = [];
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        if (choice.delta.content) {
          text += choice.delta.content;
          params.onText(choice.delta.content);
        }
        for (const delta of choice.delta.tool_calls ?? []) {
          const call = (calls[delta.index] ??= { id: "", name: "", arguments: "" });
          if (delta.id) call.id = delta.id;
          if (delta.function?.name) call.name += delta.function.name;
          if (delta.function?.arguments) call.arguments += delta.function.arguments;
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      if (finishReason === "content_filter") {
        throw new AiError("refusal", "O modelo não pôde responder a esse pedido.");
      }
      const pending = calls.filter((call) => call?.id && call.name);
      if (pending.length === 0) return;
      // Argumentos cortados no limite de tokens não são confiáveis: não executa.
      if (finishReason === "length") {
        throw new AiError("other", "A resposta foi cortada antes de terminar. Tente uma pergunta mais específica.");
      }

      messages.push({
        role: "assistant",
        content: text || null,
        tool_calls: pending.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      });
      for (const call of pending) {
        params.onToolUse(call.name);
        let input: unknown = {};
        let content: string;
        try {
          input = call.arguments ? JSON.parse(call.arguments) : {};
          content = await executeAiTool(call.name, input);
        } catch {
          content = JSON.stringify({ error: "Argumentos inválidos (JSON malformado)." });
        }
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
      params.onToolUse(null);
    }
    throw new AiError("other", "A consulta ficou longa demais. Tente dividir a pergunta.");
  } catch (err) {
    throw toAiError(err);
  }
}

const NOT_CHAT = /audio|realtime|image|tts|transcribe|embedding|moderation|whisper|dall|search|instruct|codex/;

/**
 * Modelos de conversa disponíveis para a chave, do mais novo para o mais antigo.
 * Vem da própria API para não depender de uma lista fixa de nomes; também serve de teste da chave.
 */
export async function listOpenAiModels(apiKey: string): Promise<string[]> {
  try {
    const models: { id: string; created: number }[] = [];
    for await (const model of createClient(apiKey).models.list()) {
      if (/^(gpt-|o\d|chatgpt-)/.test(model.id) && !NOT_CHAT.test(model.id)) {
        models.push({ id: model.id, created: model.created });
      }
    }
    return models.sort((a, b) => b.created - a.created).map((model) => model.id);
  } catch (err) {
    throw toAiError(err);
  }
}

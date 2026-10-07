import Anthropic from "@anthropic-ai/sdk";
import { AI_TOOLS, executeAiTool } from "./tools";
import { AiError, MAX_TOOL_ROUNDS, type RunTurnParams } from "./types";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5-5";

export const ANTHROPIC_MODELS = [
  { value: "claude-opus-5-5", label: "Claude Opus 5.5" },
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
] as const;

/**
 * O app é desktop e a chave é do próprio usuário (fica só neste dispositivo), então a chamada
 * sai direto do webview — por isso `dangerouslyAllowBrowser`.
 */
function createClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

const TOOLS: Anthropic.Tool[] = AI_TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.parameters,
}));

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AiError("auth", "A chave da Anthropic foi recusada. Confira a chave nas configurações da IA.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiError("rate_limit", "Limite de uso da Anthropic atingido. Tente de novo em instantes.");
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new AiError("other", "Esse modelo não está disponível para a sua chave. Escolha outro nas configurações.");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiError("network", "Não foi possível falar com a Anthropic. Verifique sua conexão.");
  }
  if (err instanceof Anthropic.APIError) {
    return new AiError("other", `A Anthropic devolveu um erro (${err.status ?? "sem status"}): ${err.message}`);
  }
  return new AiError("other", "Algo deu errado ao gerar a resposta.");
}

/** Um turno completo: envia a conversa, executa as ferramentas pedidas e repete até a resposta final. */
export async function runAnthropicTurn(params: RunTurnParams): Promise<void> {
  const client = createClient(params.apiKey);
  const messages: Anthropic.MessageParam[] = params.history.map((turn) => ({ role: turn.role, content: turn.text }));
  // `effort` não existe no Haiku 4.5; nos demais o padrão é explicitado (conversa rápida, sem raciocínio longo).
  const supportsEffort = !params.model.startsWith("claude-haiku");

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = client.messages.stream(
        {
          model: params.model,
          max_tokens: 16000,
          system: params.system,
          tools: TOOLS,
          messages,
          ...(supportsEffort ? { output_config: { effort: "medium" as const } } : {}),
        },
        { signal: params.signal },
      );
      stream.on("text", params.onText);
      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") {
        throw new AiError("refusal", "O modelo não pôde responder a esse pedido.");
      }
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }

      const toolUses = message.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      if (toolUses.length === 0) return;
      // Entrada de ferramenta cortada no limite de tokens não é confiável: não executa.
      if (message.stop_reason === "max_tokens") {
        throw new AiError("other", "A resposta foi cortada antes de terminar. Tente uma pergunta mais específica.");
      }

      // O conteúdo completo volta para a conversa (inclui os blocos de raciocínio que o modelo espera rever).
      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        params.onToolUse(toolUse.name);
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: await executeAiTool(toolUse.name, toolUse.input),
        });
      }
      params.onToolUse(null);
      // Todos os resultados numa única mensagem de usuário, como a API espera.
      messages.push({ role: "user", content: results });
    }
    throw new AiError("other", "A consulta ficou longa demais. Tente dividir a pergunta.");
  } catch (err) {
    throw toAiError(err);
  }
}

/** Valida a chave com uma chamada barata (lista de modelos). */
export async function testAnthropicKey(apiKey: string): Promise<void> {
  try {
    await createClient(apiKey).models.list({ limit: 1 });
  } catch (err) {
    throw toAiError(err);
  }
}

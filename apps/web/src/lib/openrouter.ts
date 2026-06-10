import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type ModelCfg = { model: string; temperature: number; max_tokens: number | null };
let modelCache: Record<string, ModelCfg> | null = null;

async function getModelConfig(): Promise<Record<string, ModelCfg>> {
  if (modelCache) return modelCache;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_models_config")
    .select("task, model, temperature, max_tokens");
  const map: Record<string, ModelCfg> = {};
  for (const r of data ?? []) {
    map[r.task] = { model: r.model, temperature: r.temperature, max_tokens: r.max_tokens };
  }
  modelCache = map;
  return map;
}

// Pipeline calls this at the start of a run so model changes take effect.
export function resetModelCache() {
  modelCache = null;
}

export type ChatArgs = {
  task: string; // key in ai_models_config
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
};

export async function chat(args: ChatArgs): Promise<string> {
  const cfg = (await getModelConfig())[args.task];
  if (!cfg) throw new Error(`no model configured for task "${args.task}"`);

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    temperature: args.temperature ?? cfg.temperature,
  };
  const mt = args.maxTokens ?? cfg.max_tokens;
  if (mt) body.max_tokens = mt;
  if (args.json) body.response_format = { type: "json_object" };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://alshaheenai.com",
      "X-Title": "Al-Shaheen",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${cfg.model} ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Extract a JSON value from a model response that may be fenced or chatty.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : raw).trim();
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  const start =
    firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start === -1) return text;
  const lastObj = text.lastIndexOf("}");
  const lastArr = text.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  return end === -1 ? text.slice(start) : text.slice(start, end + 1);
}

// Relies on strong "JSON only" prompts + extraction rather than response_format,
// which isn't uniformly supported across OpenRouter models.
export async function chatJSON<T>(args: ChatArgs): Promise<T> {
  const raw = await chat(args);
  return JSON.parse(extractJson(raw)) as T;
}

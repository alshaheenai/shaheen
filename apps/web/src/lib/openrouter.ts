import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

// ── token/cost accounting (per pipeline run) ──
export type Usage = {
  prompt: number;
  completion: number;
  total: number;
  cost: number; // USD
  calls: number;
  byTask: Record<string, { tokens: number; cost: number; calls: number }>;
};

let usage: Usage = blankUsage();
function blankUsage(): Usage {
  return { prompt: 0, completion: 0, total: 0, cost: 0, calls: 0, byTask: {} };
}
export function resetUsage() {
  usage = blankUsage();
}
export function getUsage(): Usage {
  return usage;
}
function recordUsage(task: string, u: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number }) {
  const pt = u.prompt_tokens ?? 0;
  const ct = u.completion_tokens ?? 0;
  const tt = u.total_tokens ?? pt + ct;
  const cost = u.cost ?? 0;
  usage.prompt += pt;
  usage.completion += ct;
  usage.total += tt;
  usage.cost += cost;
  usage.calls += 1;
  const bt = usage.byTask[task] ?? { tokens: 0, cost: 0, calls: 0 };
  bt.tokens += tt;
  bt.cost += cost;
  bt.calls += 1;
  usage.byTask[task] = bt;
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
    usage: { include: true }, // ask OpenRouter to return token counts + cost
  };
  const mt = args.maxTokens ?? cfg.max_tokens;
  if (mt) body.max_tokens = mt;
  if (args.json) body.response_format = { type: "json_object" };

  const fetchOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://alshaheenai.com",
      "X-Title": "Al-Shaheen",
    },
    body: JSON.stringify(body),
  };

  // Bounded retry: 3 attempts, exponential backoff (~1s, 2s). Retry only on
  // network errors / 429 / 5xx; fail fast on other 4xx. recordUsage runs only on
  // the successful call, so token/cost accounting stays accurate.
  const MAX_ATTEMPTS = 3;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, fetchOptions);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e)); // network error — retryable
      if (attempt < MAX_ATTEMPTS) {
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }
      throw lastErr;
    }

    if (res.ok) {
      const data = await res.json();
      if (data.usage) recordUsage(args.task, data.usage);
      return data.choices?.[0]?.message?.content ?? "";
    }

    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      lastErr = new Error(`OpenRouter ${cfg.model} ${res.status}`);
      await sleep(1000 * 2 ** (attempt - 1));
      continue;
    }
    const t = await res.text();
    throw new Error(`OpenRouter ${cfg.model} ${res.status}: ${t.slice(0, 300)}`);
  }
  throw lastErr ?? new Error("OpenRouter: exhausted retries");
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

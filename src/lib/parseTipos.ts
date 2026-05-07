import type { CadastroTipo } from "@/hooks/useCadastros";

const VALID_TIPOS: readonly CadastroTipo[] = [
  "cliente",
  "fornecedor",
  "transportador",
  "colaborador",
  "outro",
];

const isValidTipo = (val: unknown): val is CadastroTipo =>
  typeof val === "string" && (VALID_TIPOS as readonly string[]).includes(val);

/**
 * Normaliza o campo `tipos` (que no banco está como `text`, não `text[]`)
 * para um array de CadastroTipo. Aceita:
 *   - array nativo (já correto)
 *   - JSON string válido: '["cliente","fornecedor"]'
 *   - JSON string inválido sem aspas: '[cliente,fornecedor]'
 *   - string única: 'cliente'
 *   - null/undefined/'' → padrão ['cliente']
 */
export const parseTipos = (val: unknown): CadastroTipo[] => {
  if (Array.isArray(val)) {
    const filtered = val.filter(isValidTipo);
    return filtered.length > 0 ? filtered : ["cliente"];
  }

  if (val == null || val === "") return ["cliente"];

  if (typeof val !== "string") return ["cliente"];

  const trimmed = val.trim();
  if (!trimmed) return ["cliente"];

  // 1) Tenta parsear como JSON válido
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(isValidTipo);
      return filtered.length > 0 ? filtered : ["cliente"];
    }
    if (isValidTipo(parsed)) return [parsed];
  } catch {
    // segue para fallback
  }

  // 2) Fallback: formato "[cliente, fornecedor]" sem aspas (dado legado)
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1);
    const parts = inner
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(isValidTipo);
    return parts.length > 0 ? parts : ["cliente"];
  }

  // 3) String única
  if (isValidTipo(trimmed)) return [trimmed];

  return ["cliente"];
};

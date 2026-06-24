import { Prisma } from "@prisma/client";

/**
 * Converte recursivamente instâncias de Prisma.Decimal para number, preservando
 * o contrato JSON (number) das APIs. Necessário porque Decimal serializa como
 * string em JSON, o que quebraria a aritmética e a formatação no frontend.
 *
 * Os valores são lidos como Decimal exato no banco (storage e SUM exatos);
 * a conversão para number ocorre apenas na borda de saída, para exibição.
 */
export function serializeDecimals<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Prisma.Decimal) return data.toNumber() as unknown as T;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) return data.map((item) => serializeDecimals(item)) as unknown as T;
  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const key in data) {
      out[key] = serializeDecimals((data as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return data;
}

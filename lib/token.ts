import { createHash, timingSafeEqual } from "node:crypto";

export function extrairBearer(autorizacao: string | null): string | null {
  if (!autorizacao) {
    return null;
  }

  const partes = autorizacao.trim().split(/\s+/);
  if (partes.length !== 2 || partes[0].toLowerCase() !== "bearer" || !partes[1]) {
    return null;
  }

  return partes[1];
}

export function tokensIguais(recebido: string, esperado: string): boolean {
  const hashRecebido = createHash("sha256").update(recebido).digest();
  const hashEsperado = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(hashRecebido, hashEsperado);
}

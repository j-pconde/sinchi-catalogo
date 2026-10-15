const JANELA_MS = 5 * 60 * 1000;
const MAXIMO_POR_JANELA = 5;

type Registro = {
  quantidade: number;
  expiraEm: number;
};

const janelas = new Map<string, Registro>();

export function permitirChamada(chave: string): { permitido: boolean; tentarNovamenteEm: number } {
  const agora = Date.now();
  const atual = janelas.get(chave);

  if (!atual || agora >= atual.expiraEm) {
    janelas.set(chave, { quantidade: 1, expiraEm: agora + JANELA_MS });
    return { permitido: true, tentarNovamenteEm: Math.ceil(JANELA_MS / 1000) };
  }

  if (atual.quantidade >= MAXIMO_POR_JANELA) {
    return {
      permitido: false,
      tentarNovamenteEm: Math.max(1, Math.ceil((atual.expiraEm - agora) / 1000)),
    };
  }

  atual.quantidade += 1;
  return {
    permitido: true,
    tentarNovamenteEm: Math.max(1, Math.ceil((atual.expiraEm - agora) / 1000)),
  };
}

export function chaveCliente(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for");
  const ip = encaminhado?.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip")?.trim() || "desconhecido";
}

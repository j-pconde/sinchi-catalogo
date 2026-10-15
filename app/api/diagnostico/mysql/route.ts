import { diagnosticoHabilitado, mysqlConfigurado, tokenDiagnostico } from "@/lib/diagnostico-config";
import { executarDiagnosticoMysql } from "@/lib/mysql-diagnostico";
import { chaveCliente, permitirChamada } from "@/lib/rate-limit";
import { extrairBearer, tokensIguais } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(corpo: unknown, status: number, extras?: HeadersInit) {
  return Response.json(corpo, { status, headers: extras });
}

export async function POST(request: Request) {
  if (!diagnosticoHabilitado()) {
    return json({ diagnostico: "desabilitado" }, 503);
  }

  const limite = permitirChamada(`diagnostico-mysql:${chaveCliente(request)}`);
  if (!limite.permitido) {
    return json(
      { erro: "limite_excedido" },
      429,
      { "Retry-After": String(limite.tentarNovamenteEm) },
    );
  }

  const recebido = extrairBearer(request.headers.get("authorization"));
  if (!recebido || !tokensIguais(recebido, tokenDiagnostico())) {
    return json({ erro: "nao_autorizado" }, 401);
  }

  if (!mysqlConfigurado()) {
    return json({ mysql: "indisponivel" }, 503);
  }

  const resumo = await executarDiagnosticoMysql();
  const status = resumo.resultado === "ok" ? 200 : 503;
  return json(
    {
      resultado: resumo.resultado,
      etapas: resumo.etapas,
    },
    status,
  );
}

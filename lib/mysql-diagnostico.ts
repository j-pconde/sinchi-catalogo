import { randomUUID } from "node:crypto";
import mysql, { type PoolConnection, type QueryResult, type RowDataPacket } from "mysql2/promise";
import { mysqlConfigurado, mysqlPoolConfig } from "@/lib/diagnostico-config";

const LIMITE_CONEXOES = 2;
const CONNECT_TIMEOUT_MS = 8_000;
const QUERY_TIMEOUT_MS = 5_000;
const TABELA = "diagnostico_infra";

export type EtapaDiagnostico =
  | "ok"
  | "falhou"
  | "nao_executado"
  | "tabela_ausente"
  | "timeout"
  | "conexao_falhou";

export type ResumoDiagnostico = {
  resultado: "ok" | "falhou" | "indisponivel";
  etapas: {
    conexao: EtapaDiagnostico;
    select1: EtapaDiagnostico;
    escritaLeitura: EtapaDiagnostico;
    rollback: EtapaDiagnostico;
    limpeza: EtapaDiagnostico;
  };
};

function etapasVazias(): ResumoDiagnostico["etapas"] {
  return {
    conexao: "nao_executado",
    select1: "nao_executado",
    escritaLeitura: "nao_executado",
    rollback: "nao_executado",
    limpeza: "nao_executado",
  };
}

function classificarErro(erro: unknown): EtapaDiagnostico {
  const codigo =
    erro && typeof erro === "object" && "code" in erro ? String((erro as { code: unknown }).code) : "";

  if (codigo === "ER_NO_SUCH_TABLE") {
    return "tabela_ausente";
  }
  if (codigo === "ETIMEDOUT" || codigo === "PROTOCOL_SEQUENCE_TIMEOUT") {
    return "timeout";
  }
  if (codigo === "ECONNREFUSED" || codigo === "ENOTFOUND" || codigo === "ENETUNREACH") {
    return "conexao_falhou";
  }
  return "falhou";
}

function marcarFalha(
  etapas: ResumoDiagnostico["etapas"],
  codigo: EtapaDiagnostico,
): ResumoDiagnostico["etapas"] {
  if (etapas.conexao !== "ok") {
    return { ...etapas, conexao: codigo };
  }
  if (etapas.select1 !== "ok") {
    return { ...etapas, select1: codigo };
  }
  if (etapas.escritaLeitura === "nao_executado") {
    return { ...etapas, escritaLeitura: codigo };
  }
  if (etapas.rollback === "nao_executado") {
    return { ...etapas, rollback: codigo };
  }
  if (etapas.limpeza === "nao_executado") {
    return { ...etapas, limpeza: codigo };
  }
  return etapas;
}

async function executar<T extends QueryResult>(
  conexao: PoolConnection,
  sql: string,
  valores: ReadonlyArray<string> = [],
) {
  return conexao.execute<T>({ sql, timeout: QUERY_TIMEOUT_MS }, [...valores]);
}

export async function executarDiagnosticoMysql(): Promise<ResumoDiagnostico> {
  const etapas = etapasVazias();

  if (!mysqlConfigurado()) {
    return { resultado: "indisponivel", etapas };
  }

  const pool = mysql.createPool({
    ...mysqlPoolConfig(),
    waitForConnections: true,
    connectionLimit: LIMITE_CONEXOES,
    maxIdle: 1,
    idleTimeout: 10_000,
    queueLimit: 0,
    connectTimeout: CONNECT_TIMEOUT_MS,
    enableKeepAlive: false,
  });

  const marcadorEscrita = randomUUID();
  const marcadorRollback = randomUUID();
  let conexao: PoolConnection | undefined;

  try {
    conexao = await pool.getConnection();
    etapas.conexao = "ok";

    const [select1] = await executar<RowDataPacket[]>(conexao, "SELECT 1 AS ok");
    if (!Array.isArray(select1) || select1.length === 0) {
      etapas.select1 = "falhou";
      return { resultado: "falhou", etapas };
    }
    etapas.select1 = "ok";

    await executar(conexao, `INSERT INTO ${TABELA} (marcador) VALUES (?)`, [marcadorEscrita]);
    const [lidos] = await executar<RowDataPacket[]>(
      conexao,
      `SELECT marcador FROM ${TABELA} WHERE marcador = ? LIMIT 1`,
      [marcadorEscrita],
    );
    etapas.escritaLeitura = Array.isArray(lidos) && lidos.length === 1 ? "ok" : "falhou";

    await conexao.beginTransaction();
    try {
      await executar(conexao, `INSERT INTO ${TABELA} (marcador) VALUES (?)`, [marcadorRollback]);
      await conexao.rollback();
    } catch (erro) {
      try {
        await conexao.rollback();
      } catch {
        // Rollback de segurança; o erro original segue abaixo.
      }
      throw erro;
    }

    const [aposRollback] = await executar<RowDataPacket[]>(
      conexao,
      `SELECT marcador FROM ${TABELA} WHERE marcador = ? LIMIT 1`,
      [marcadorRollback],
    );
    etapas.rollback = Array.isArray(aposRollback) && aposRollback.length === 0 ? "ok" : "falhou";

    await executar(conexao, `DELETE FROM ${TABELA} WHERE marcador IN (?, ?)`, [
      marcadorEscrita,
      marcadorRollback,
    ]);
    const [restantes] = await executar<RowDataPacket[]>(
      conexao,
      `SELECT marcador FROM ${TABELA} WHERE marcador IN (?, ?)`,
      [marcadorEscrita, marcadorRollback],
    );
    etapas.limpeza = Array.isArray(restantes) && restantes.length === 0 ? "ok" : "falhou";

    const ok =
      etapas.conexao === "ok" &&
      etapas.select1 === "ok" &&
      etapas.escritaLeitura === "ok" &&
      etapas.rollback === "ok" &&
      etapas.limpeza === "ok";

    return { resultado: ok ? "ok" : "falhou", etapas };
  } catch (erro) {
    return { resultado: "falhou", etapas: marcarFalha(etapas, classificarErro(erro)) };
  } finally {
    conexao?.release();
    await pool.end();
  }
}

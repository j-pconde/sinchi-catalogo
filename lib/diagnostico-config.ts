function valor(nome: string): string {
  return process.env[nome]?.trim() ?? "";
}

export function diagnosticoHabilitado(): boolean {
  return valor("DIAGNOSTICO_ENABLED").toLowerCase() === "true" && valor("DIAGNOSTICO_TOKEN").length > 0;
}

export function tokenDiagnostico(): string {
  return valor("DIAGNOSTICO_TOKEN");
}

export function mysqlConfigurado(): boolean {
  return Boolean(valor("MYSQL_HOST") && valor("MYSQL_USER") && valor("MYSQL_DATABASE"));
}

export function mysqlPoolConfig() {
  const portaBruta = valor("MYSQL_PORT");
  const porta = portaBruta ? Number.parseInt(portaBruta, 10) : 3306;

  return {
    host: valor("MYSQL_HOST"),
    port: Number.isFinite(porta) ? porta : 3306,
    user: valor("MYSQL_USER"),
    password: valor("MYSQL_PASSWORD"),
    database: valor("MYSQL_DATABASE"),
  };
}

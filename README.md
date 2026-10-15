# Catálogo Sinchi — validação de infraestrutura

Aplicação mínima e independente para comprovar Next.js, rotas de backend e MySQL na Hostinger Business Web Hosting. Esta etapa não inclui vitrine, produtos, carrinho, autenticação de clientes, pagamentos nem integração com WhatsApp.

Destino previsto: `www.sinchi.com.br`. A validação inicial deve usar o endereço temporário gerado pela Hostinger, sem alterar DNS nem o site existente.

## Requisitos locais

- Node.js 24 (a hospedagem oferece esta versão)
- npm (o repositório inclui `package-lock.json`)
- Banco MySQL exclusivo de teste, somente quando for validar o diagnóstico

Não é necessário SSH, acesso root, Docker, Redis nem ORM nesta etapa.

## Comandos locais

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run start
```

Para desenvolvimento:

```bash
npm run dev
```

A aplicação sobe em `http://localhost:3000` por padrão. Abra a página inicial e `GET /api/health` mesmo sem MySQL configurado.

## Preparação do banco exclusivo

1. No hPanel, crie um banco MySQL **somente para este catálogo de teste**.
2. Não reutilize banco, usuário ou dados da ERP ou de outro projeto.
3. Execute manualmente o script `scripts/preparar-diagnostico-mysql.sql` no phpMyAdmin (ou ferramenta equivalente do hPanel).
4. A aplicação **não** cria tabelas ao iniciar.

O diagnóstico usa apenas a tabela `diagnostico_infra`. Ele faz `SELECT 1`, escrita/leitura, rollback e limpeza dos registros de teste.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` no computador. Arquivos `.env*` reais não entram no Git.

| Variável | Função |
| --- | --- |
| `DIAGNOSTICO_ENABLED` | `true` habilita `POST /api/diagnostico/mysql`. Qualquer outro valor desabilita. |
| `DIAGNOSTICO_TOKEN` | Segredo Bearer **somente no servidor**. Se estiver vazio, a rota permanece desabilitada. |
| `MYSQL_HOST` | Host do MySQL de teste |
| `MYSQL_PORT` | Porta (placeholder `3306`) |
| `MYSQL_USER` | Usuário do banco de teste |
| `MYSQL_PASSWORD` | Senha do usuário de teste |
| `MYSQL_DATABASE` | Nome do banco exclusivo |

Todas as credenciais são server-side. Não use prefixo `NEXT_PUBLIC_` para estes valores. Não coloque o token no frontend, em URLs ou em logs.

Sem MySQL configurado, a aplicação continua servindo a página inicial e `/api/health`. A rota protegida responde indisponibilidade de forma controlada, sem stack trace.

## Chamada ao diagnóstico

Defina `APP_URL` e `DIAGNOSTICO_TOKEN` no ambiente da sua sessão. Não cole o token no comando.

PowerShell:

```powershell
Invoke-RestMethod -Method POST -Uri "$env:APP_URL/api/diagnostico/mysql" -Headers @{ Authorization = "Bearer $env:DIAGNOSTICO_TOKEN" }
```

Bash:

```bash
curl -sS -X POST "$APP_URL/api/diagnostico/mysql" \
  -H "Authorization: Bearer ${DIAGNOSTICO_TOKEN}"
```

A rota rejeita chamadas sem `Authorization: Bearer …` **antes** de acessar o banco. Há limite de frequência por origem.

## Publicação na Hostinger via GitHub

Não publique automaticamente a partir deste repositório até o remoto de destino estar definido. Quando for publicar:

1. Envie este projeto a um repositório GitHub **novo**, sem usar o repositório antigo `appweb` como base.
2. No hPanel: **Websites → Add Website → Node.js web app**.
3. Escolha **Import Git repository**, autorize o GitHub e selecione este repositório/branch.
4. Confirme as configurações abaixo e clique em **Deploy**.
5. Use o endereço temporário da Hostinger para a validação. Não altere DNS nem `www.sinchi.com.br` nesta etapa.

A Hostinger detecta Next.js, executa o build e inicia o servidor. Não é necessário SSH, Docker nem processo manual em `public_html`. Arquivos gravados no filesystem da aplicação **não devem ser tratados como persistentes** após um deploy. Esta etapa não armazena imagens em disco.

Documentação de referência:

- [Criar um app Node.js](https://docs.hostinger.com/node.js/creating-an-app)
- [Next.js na Hostinger](https://docs.hostinger.com/node.js/overview-1/next)

## Configurações de build, start e diretório raiz

No hPanel, use a raiz deste repositório (não uma subpasta).

| Campo | Valor |
| --- | --- |
| Framework | Next.js (`next`) |
| Diretório raiz | `/` (raiz do repositório) |
| Node.js | **24** |
| Gerenciador | npm (detectado pelo `package-lock.json`) |
| Install | `npm ci` |
| Build | `npm run build` (script `build`) |
| Output directory | `.next` |
| Start | o preset Next.js inicia o servidor; se o painel pedir comando, `npm run start` |
| Entry file | ignorado para Next.js |

A Hostinger aplica `output: "standalone"` no deploy. Não defina `output` em `next.config.ts`.

Variáveis no hPanel (Environment variables), **não** no frontend:

- `DIAGNOSTICO_ENABLED`
- `DIAGNOSTICO_TOKEN`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Crie o banco no MySQL da própria hospedagem e informe host/usuário gerados pelo hPanel. Não use o banco da ERP.

## Como desabilitar o diagnóstico após os testes

1. No hPanel, defina `DIAGNOSTICO_ENABLED=false`.
2. Remova `DIAGNOSTICO_TOKEN` das variáveis de ambiente.
3. Reinicie ou faça um novo deploy da web app.
4. Confirme que `POST /api/diagnostico/mysql` responde `diagnostico: desabilitado` e que `GET /api/health` continua `ok`.

A tabela `diagnostico_infra` pode ser removida do banco de teste depois da validação.

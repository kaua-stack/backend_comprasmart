# Patch de autenticação e persistência do CompraSmart

## Diagnóstico

O branch `main` já continha uma correção inicial para autenticação, mas o model ainda dependia de um schema completo. A consulta de usuário juntava `roles` e selecionava `user_google_id`; em bancos criados antes da correção, qualquer tabela ou coluna ausente fazia a consulta do cadastro e do login falhar antes da gravação. O arquivo SQL também usava `CREATE TABLE IF NOT EXISTS`, que não atualiza tabelas já existentes. Por isso, executar novamente o schema não corrigia um banco legado.

Havia ainda um problema de autorização: `roles` é populada com `admin` como `role_id=1`, enquanto o cadastro normal usava `role_id=1` por padrão. Assim, novos usuários poderiam ser registrados como administradores.

## Alterações

`models/RegisterModel.js` agora tenta a consulta com o nome da role, depois uma consulta compatível com o schema atual sem a tabela `roles` e, por fim, uma consulta mínima para tabelas antigas. O cadastro procura a role `user` pelo nome e usa `role_id=2` somente como fallback; se as colunas de role/status não existirem, executa um `INSERT` mínimo com nome, e-mail e hash bcrypt. O login por e-mail não depende mais de `user_google_id`.

O novo `sql/migrate_auth.sql` é idempotente e adiciona as tabelas/colunas necessárias em um banco já existente. O `sql/comprasmart.sql` passa a definir a role comum como padrão para novos registros. O arquivo `.env.example` documenta as variáveis obrigatórias de conexão, JWT, cookie e CORS.

## Aplicação

Copie `.env.example` para `.env`, preencha as credenciais reais e execute a migração no banco configurado por `DB_NAME`:

```bash
cp .env.example .env
mariadb -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < sql/migrate_auth.sql
npm ci
npm run check
npm start
```

Não versione `.env`. Os dois secrets JWT devem ser longos, aleatórios e diferentes entre si. O frontend deve enviar `credentials: "include"` nas chamadas que dependem do cookie de refresh.

## Validação realizada

A suíte `npm run check` terminou com **7 testes aprovados**. Além dos cinco testes existentes, foram adicionados cenários que simulam a ausência da tabela `roles` e das colunas opcionais, verificando o fallback de leitura e o `INSERT` mínimo.

Também foi executada uma integração real com MariaDB. Em um schema legado migrado, o cadastro retornou `201`, o usuário foi persistido com hash `$2b$`, `role_id=2` e `user_status=1`, o login retornou `200`, o JWT carregou `role: "user"` e uma linha de refresh token foi gravada em `tokens`.

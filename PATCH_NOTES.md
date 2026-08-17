# Patch do backend CompraSmart

## Correções aplicadas

O patch corrige o CORS para trabalhar com cookies HTTP-only e credenciais. As origens permitidas são lidas de `CORS_ORIGINS` ou `FRONTEND_URL`, separadas por vírgulas; quando nenhuma variável é definida, são aceitas as portas locais mais comuns. O uso de `origin: "*"` foi removido porque é incompatível com `credentials: true`.

O cadastro e o login agora usam um model MySQL completo. O cadastro valida nome, e-mail e senha, verifica duplicidade, aplica hash bcrypt e responde `201`. O login normaliza o e-mail, compara a senha com bcrypt, emite access token JWT e grava o refresh token no banco e em cookie HTTP-only.

Também foram corrigidos os fluxos de refresh, logout e login Google, o parsing do header Bearer, a rotação dos refresh tokens e a política de cookie em desenvolvimento e produção. A aplicação foi separada em `app.js`, o que permite testes sem iniciar um processo permanente.

## Configuração

Copie `.env.example` para `.env` e preencha os dados reais do MySQL e dois segredos JWT diferentes. Não versionar `.env`.

Em desenvolvimento local, use `COOKIE_SECURE=false` e `COOKIE_SAMESITE=lax`. Em produção com HTTPS, use `COOKIE_SECURE=true` e `COOKIE_SAMESITE=none`. A origem exata do frontend deve estar em `CORS_ORIGINS`, por exemplo `https://comprasmart.example.com`.

O frontend precisa enviar credenciais nas chamadas que usam o cookie de refresh:

```js
fetch("http://localhost:3000/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_email: "usuario@example.com",
    user_password: "Senha@123",
  }),
});
```

Para endpoints protegidos, envie o access token retornado no corpo da resposta:

```http
Authorization: Bearer <accessToken>
```

## Endpoints principais

| Método | Endpoint | Uso | Autenticação |
| --- | --- | --- | --- |
| `POST` | `/user` | Cadastrar usuário | Não |
| `POST` | `/login` | Login com e-mail e senha | Não |
| `POST` | `/refresh` | Renovar access token pelo cookie | Cookie HTTP-only |
| `POST` | `/logout` | Invalidar refresh token | Cookie HTTP-only |
| `POST` | `/login/google` | Login Google opcional | Não |
| `GET` | `/health` | Verificar disponibilidade | Não |

## Contrato mínimo do MySQL

O código mantém os nomes usados no projeto original. A tabela `users` precisa conter, no mínimo, `user_id`, `user_name`, `user_email`, `user_password`, `role_id` e `user_status`; `user_google_id` é necessária apenas para login Google. A tabela `tokens` precisa conter `token`, `expires_at` e `user_id`. Se existir uma tabela `roles` com `role_id` e `role_name`, ela será usada para preencher a claim `role`; caso contrário, o `role_id` será usado como fallback.

## Validação executada

`npm run check` foi executado com quatro testes aprovados: health check, preflight CORS permitido com credenciais, rejeição de login sem campos obrigatórios e emissão/verificação de JWT. Também foi executado `node --check` em todos os arquivos JavaScript.

A validação contra cadastro e login reais depende de um MySQL acessível e de um schema compatível, pois o repositório não contém credenciais nem arquivo SQL versionado.

# Diagnóstico do backend CompraSmart

## Problemas encontrados

1. O CORS usa `origin: "*"` com `credentials: false`, mas login, refresh e logout dependem de cookie HTTP-only. Em uma aplicação com frontend separado, o navegador precisa de `Access-Control-Allow-Credentials: true` e de uma origem explícita.
2. `models/RegisterModel.js` é apenas um stub: não implementa `selectUserByEmail`, `insertUser`, `selectUserById`, `selectAllUsers`, `updateUser` nem `deleteUser`. Por isso cadastro e login falham quando os controllers tentam acessar o banco.
3. O controller de autenticação contém inconsistências de nomes: a função `issueSession` usa `generateTokens`, embora o import seja `generateTokkens`; o fluxo Google usa `userModel`, embora o import seja `usersModel`.
4. A rotação de refresh token reaproveita somente o ID do usuário, descartando e-mail e função, e configura `cookie.maxAge` com um objeto `Date` em vez de milissegundos.
5. O logout tenta remover token do banco mesmo quando nenhum cookie foi enviado.
6. A validação de registro pressupõe que todos os campos sejam strings e o login não possui validação de entrada própria.
7. O model de tokens está acoplado ao pool, mas o fluxo precisa lidar de forma consistente com cookie, token assinado e usuário existente.

## Escopo do patch

- Configuração de CORS baseada em `CORS_ORIGINS`/`FRONTEND_URL`, com suporte a credenciais e preflight.
- Model completo de usuários compatível com `mysql2/promise`.
- Validação de cadastro e login.
- Emissão, renovação e remoção de sessões com cookies seguros por ambiente.
- Correção de imports, nomes, respostas HTTP e tratamento de erros.
- Separação da criação da aplicação (`app.js`) do processo de escuta (`server.js`) para permitir validação automatizada.

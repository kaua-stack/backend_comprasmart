import bcrypt from "bcrypt";
import generateTokkens from "../utils/generateTokken.js";
import usersModel from "../models/RegisterModel.js";
import tokenModel from "../models/tokenModel.js";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
 
dotenv.config();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const DEFAULT_GOOGLE_ROLE_ID = 1;
 
async function issueSession(res, user) {
    const accessToken = generateTokens.generateAccessToken(user);
    const refreshToken = generateTokens.generateRefreshToken(user);
 
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 dias
 
    const savedToken = await tokenModel.createToken({
        user_id: user.user_id,
        token: refreshToken,
        expires_at: expiresAt,
    });
 
    if (savedToken.affectedRows === 0) {
        return null;
    }
 
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        // secure: process.env.COOKIE_SECRET,
        secure: false,
        sameSite: "strict",
        maxAge: 604800000,
    });
 
    return accessToken;
}
 
 
class AuthLoginController {
    async login(req, res) {
        try {
            const { user_email, user_password } = req.body;
            const [emailExists] = await usersModel.selectUserByEmail(user_email)
            if (!emailExists) {
                return res.status(400).json({ error: "Email ou senha invalido!" });
            }
 
            //compara a senha digitada com a senha criptografada no banco de dados, usando o bcrypt para fazer a comparação
            const validyPassword = await bcrypt.compare(user_password, emailExists.user_password);
 
            if (!validyPassword) {
                return res.status(400).json({ error: "Email ou senha invalido!" });
            }
 
            //gerar o token de acesso e o token de refresh, usando a função generateAccessToken e generateRefreshToken do arquivo generateTokkens.js
            const accessToken = generateTokkens.generateAccessToken(emailExists);
            const refreshToken = generateTokkens.generateRefreshToken(emailExists);
 
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expira em 7 dias para alterar o tempo de expiração do token de refresh, basta alterar o valor multiplicado por 7 (dias), 24 (horas), 60 (minutos), 60 (segundos) e 1000 (milissegundos)
 
            const savedToken = await tokenModel.createToken({
                user_id: emailExists.user_id,
                token: refreshToken,
                expires_at: expiresAt
            });
 
            if (savedToken.affectedRows === 0) {
                return res.status(500).json({ error: "Erro ao salvar token de refresh!" });
            }
 
            //primeiro parametro passado é o nome do cookie, o segundo é o valor do cookie, e o terceiro são as configurações do cookie, como httpOnly, secure, etc. (opcional)
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true, // O cookie só pode ser acessado pelo servidor, não pelo JavaScript do cliente
                // o resultado desse secure vai vir como false algo necessario para rodar na maquina local
                secure: false,//process.env.COOKIE_ENV === "production", // O cookie só será enviado em conexões seguras (HTTPS) no ambiente de produção
                //a versão abaixo funciona somente em https impedindo acessos http
                //secure: process.env.COOKIE_ENV,
                sameSite: "strict", // O cookie só será enviado para o mesmo site, prevenindo ataques CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000, // O cookie expira em 7 dias
            });
 
            return res.json({ success: "Login bem-sucedido!", accessToken: accessToken });
        } catch (error) {
            res.status(500).json({ error: `Erro ao realizar login! ${error.message}` });
        }
 
    }
    async googleLogin(req, res) {
            const { credential } = req.body;
   
            if (!credential) {
                return res.status(400).json({
                    error: "Credencial do Google não fornecida!",
                });
            }
   
            let payload;
   
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: credential,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
   
                payload = ticket.getPayload();
            } catch (error) {
                return res.status(401).json({
                    error: "Token do Google inválido!",
                });
            }
   
            if (!payload?.email_verified) {
                return res.status(401).json({
                    error: "Email do Google não verificado!",
                });
            }
   
            const { sub: googleId, email, name } = payload;
   
            let [user] = await userModel.selectUserByGoogleId(googleId);
   
            if (!user) {
                const [userByEmail] = await userModel.selectUserByEmail(email);
   
                if (userByEmail) {
                    await userModel.linkGoogleAccount(userByEmail.user_id, googleId);
                    user = userByEmail;
                } else {
                    const newUser = await userModel.insertGoogleUser({
                        user_name: name,
                        user_email: email,
                        user_google_id: googleId,
                        role_id: DEFAULT_GOOGLE_ROLE_ID,
                        user_status: 1,
                    });
   
                    if (newUser.affectedRows === 0) {
                        return res.status(500).json({
                            error: "Erro ao cadastrar usuário via Google!",
                        });
                    }
   
                    [user] = await userModel.selectUserByGoogleId(googleId);
                }
            }
   
            const accessToken = await issueSession(res, user);
   
            if (!accessToken) {
                return res.status(500).json({
                    error: "Erro ao criar token!",
                });
            }
   
            return res.json({
                success: "Login com Google realizado com sucesso!",
                accessToken,
            });
        }
 
    async refreshToken(req, res) {
        const rfToken = req.cookies?.refreshToken;
        console.log(rfToken);
 
        if (!rfToken) {
            return res.status(401).json({ error: "Token de refresh não encontrado!" });
        }
 
        const [tokenExists] = await tokenModel.selectByToken(rfToken);
        console.log(tokenExists);
 
 
        if (!tokenExists) {
            return res.status(401).json({ error: "Token invalido!" })
        }
 
        jwt.verify(rfToken, process.env.REFRESH_TOKEN_SECRET, async (error, usuarioDecodificado) => {
            if (error) {
                return res.status(403).json({ error: "Token invalido ou expirado. " + error.message })
            }
 
            await tokenModel.deleteToken(rfToken);
 
            const { iat, exp, ...userData } = usuarioDecodificado
 
            const accessToken = generateTokkens.generateAccessToken(userData);
            const newRefreshToken = generateTokkens.generateRefreshToken(userData);
            console.log(newRefreshToken);
 
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
 
            const savedToken = await tokenModel.createToken({
                user_id: userData.id,
                token: newRefreshToken,
                expires_at: expiresAt
            });
            if (savedToken.affectedRows === 0) {
                return res.status(500).json({
                    error: "Erro ao cadastrar o token!",
                });
            }
 
            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: expiresAt,
            });
 
            return res.status(200).json({
                success: "Sessão atualizada com sucesso!",
                accessToken,
            });
        })
 
    }
 
    async logout(req, res) {
        const refreshToken = req.cookies?.refreshToken;
 
        const deleteToken = await tokenModel.deleteToken(refreshToken);
 
        res.clearCookie("refreshToken"
            // , {
            // httpOnly: true,
            // secure: process.env.COOKIE_ENV === "production",
            // sameSite: "strict",}
        );
 
        if (deleteToken.affectedRows > 0) {
            return res.status(201).json({ success: "Logout realizado!" })
        }
 
        return res.status(500).json({ error: "Erro ao deletar token" })
    }
 
    //----------------------------------------------------------------------------------------------------------------------
    // async login(req,res){
    //     try {
    //         const { user_email, user_password } = req.body;
 
    //         const [user] = await userModel.selectUserByEmail(user_email);
 
    //         if (!user) {
    //             return res.status(404).json({ error: "Usuário não encontrado!" });
    //         }
 
    //         const isPasswordValid = await bcrypt.compare(user_password, user.user_password);
 
    //         if (!isPasswordValid) {
    //             return res.status(401).json({ error: "Senha incorreta!" });
    //         }
 
    //         const token = jwt.sign(
    //             { user_id: user.user_id, role_id: user.role_id },
 
    //             //chave secreta protegida pegando do arquivo .env
    //             process.env.JWT_SECRET,
    //             { expiresIn: "1d" }
    //         );
 
    //         //retorna o token para o frontend, para que ele possa usar nas próximas requisições
    //         return res.status(200).json({ success: "Login bem-sucedido!", token: token });
    //     } catch (error) {
    //         return res.status(500).json({ error: `Erro ao realizar login! ${error.message}` });
    //     }
    // }
 
 
    // async changePassword(req,res){
    //     try {
    //         const { user_id } = req.params;
    //         const { new_password } = req.body;
 
    //         const [user] = await userModel.selectUserById(user_id);
 
    //         if (!user) {
    //             return res.status(404).json({ error: "Usuário não encontrado!" });
    //         }
 
    //         const hashedPassword = await bcrypt.hash(new_password, 10);
 
    //         const result = await userModel.updateUser(user_id, {
    //             ...user,
    //             user_password: hashedPassword,
    //         });
 
    //         if (result.affectedRows > 0) {
    //             return res.status(200).json({ success: "Senha atualizada com sucesso!" });
    //         } else {
    //             return res.status(400).json({ error: "Nenhuma alteração foi feita." });
    //         }
    //     } catch (error) {
    //         return res.status(500).json({ error: `Erro ao atualizar senha! ${error.message}` });
    //     }
    // }
 
 
}
 
export default new AuthLoginController();
 
 
 
 
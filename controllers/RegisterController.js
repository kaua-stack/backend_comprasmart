import bcrypt from "bcrypt";
import userModel from "../models/RegisterModel.js";
import jwt from "jsonwebtoken";

class RegisterController {
    async getAllUsers(req, res) {
        try {
            const allUsers = await userModel.selectAllUsers();

            if (allUsers.length === 0) {
                return res.status(404).json({
                    error: "Nenhum usuário encontrado",
                });
            }

            return res.status(200).json(allUsers);
        } catch (err) {
            return res.status(500).json({
                error: "Erro ao buscar usuários",
            });
        }
    }

    async getUserById(req, res) {
        try {
            const { user_id } = req.params;

            const userById = await userModel.selectUserById(user_id);

           

            if (userById.length === 0) {
                return res.status(404).json({
                    error: "Usuário não encontrado!",
                });
            }

            return res.status(200).json(userById);
        } catch (err) {
            return res.status(500).json({
                error: "Erro ao buscar usuário!",
            });
        }
    }

    async getUserByEmail(req, res) {
        try {
            const { user_email } = req.params;

            const [userByEmail] = await userModel.selectUserByEmail(user_email);

            if (!userByEmail) {
                return res.status(404).json({
                    error: "Usuario não encontrado",
                });
            }

            return res.status(200).json(userByEmail);
        } catch (err) {
            return res.status(500).json({
                error: "Erro ao buscar usuário por email!",
            });
        }
    }

    async createUser(req, res) {
        try {
            const {
                user_name,
                user_email,
                user_password,
                
            } = req.body;

            const [existsUser] = await userModel.selectUserByEmail(
                req.body.user_email
            );

            if (existsUser) {
                return res.status(400).json({
                    error: "Este email já está cadastrado no sistema!",
                });
            }

            const hashedPassword = await bcrypt.hash(user_password, 10);

            const newUser = await userModel.insertUser({
                user_name: user_name.trim(),
                user_email: user_email.trim(),
                user_password: hashedPassword,
              
            });

            if (newUser.affectedRows > 0) {
                return res.status(200).json({
                    success: "Usuário cadastrado com sucesso!",
                });
            }
        } catch (error) {
            return res.status(500).json({
                error: `Erro ao criar usuário! ${error}`,
            });
        }
    }

    async updateUser(req, res) {
        try {
            const { user_id } = req.params;
            const {
                user_name,
                user_email,
                user_password,
            } = req.body;

            // 1. Verifica se o e-mail já pertence a outro usuário
            const [existsUser] = await userModel.selectUserByEmail(user_email, user_id);
            if (existsUser && existsUser.user_id !== Number(user_id)) {
                return res.status(400).json({
                    error: "Este email já está cadastrado no sistema!",
                });
            }

            // 2. Busca o usuário atual no banco
            const [currentUser] = await userModel.selectUserById(user_id);
            if (!currentUser) {
                return res.status(404).json({ error: "Usuário não encontrado" });
            }

            let hashedPassword = currentUser.user_password; // Mantém a senha antiga por padrão

            // 3. Se uma NOVA senha foi enviada, faz a lógica de comparação e criptografia
            if (user_password) {
                // O bcrypt.compare vai dizer se "1234" corresponde à hash do banco
                const isSamePassword = await bcrypt.compare(user_password, currentUser.user_password);

                // SE NÃO FOR A MESMA SENHA: O usuário digitou algo novo. 
                if (!isSamePassword) {
                    // Agora gera uma nova hash para a senha nova
                    hashedPassword = await bcrypt.hash(user_password, 10);
                }
            }

            // 4. Executa a atualização
            const result = await userModel.updateUser(user_id, {
                user_name: user_name.trim(),
                user_email: user_email.trim(),
                user_password: hashedPassword, // Salva a nova hash ou mantém a antiga
                
            });

            if (result.affectedRows > 0) {
                return res.status(200).json({ success: "Usuário atualizado com sucesso!" });
            } else {
                return res.status(400).json({ error: "Nenhuma alteração foi feita." });
            }

        } catch (error) {
            return res.status(500).json({ error: `Erro ao atualizar usuário! ${error.message}` });
        }
    }

    //-----------------------------------------------------------
    // async updateUser(req, res) {
    //     try {
    //         const { user_id } = req.params;
    //         const {
    //             user_name,
    //             user_email,
    //             user_password,
    //             user_phone,
    //             role_id,
    //             user_status,
    //         } = req.body;

    //         const [existsUser] = await userModel.selectUserByEmail(user_email,user_id);

    //         if (existsUser) {
    //             return res.status(400).json({
    //                 error: "Este email já está cadastrado no sistema!",
    //             });
    //         }

    //         const existsPassword = await userModel.selectUserById(user_id);

    //         if (existsPassword) {
    //             const comperingPassword = await bcrypt.compare(
    //                 user_password,
    //                 existsPassword.user_password
    //             );
    //         }

    //         const hashedPassword = await bcrypt.hash(user_password, 10);

    //         if (comperingPassword) {
    //             const result = await userModel.updateUser(user_id, {
    //                 user_name,
    //                 user_email,
    //                 user_password: existsPassword.user_password,
    //                 user_phone,
    //                 role_id,
    //                 user_status,
    //             });

    //             if (result.affectedRows > 0) {
    //                 return res.status(200).json({ success: "usuario atualizado" });
    //             }
    //         }
    //     } catch (error) {
    //         return res.status(500).json(`Erro ao criar usuário! ${error}`);
    //     }
    // }
    //-----------------------------------------------------------



    async deleteUser(req, res) {
        try {
            const { user_id } = req.params;

            const result = await userModel.deleteUser(user_id);

            if (result.affectedRows > 0) {
                return res.status(200).json({ success: "usuario deletado" });
            }
        } catch (error) {
            return res.status(500).json({ error: `Erro ao criar usuário! ${error}` });
        }
    }
}

export default new RegisterController();

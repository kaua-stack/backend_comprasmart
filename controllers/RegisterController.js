import bcrypt from "bcrypt";
import userModel from "../models/RegisterModel.js";

function publicUser(user) {
  if (!user) return user;

  const { user_password: _password, ...safeUser } = user;
  return safeUser;
}

class RegisterController {
  async getAllUsers(_req, res) {
    try {
      const users = await userModel.selectAllUsers();
      return res.status(200).json(users.map(publicUser));
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  }

  async getUserById(req, res) {
    try {
      const [user] = await userModel.selectUserById(req.params.user_id);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.status(200).json(publicUser(user));
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      return res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  }

  async getUserByEmail(req, res) {
    try {
      const [user] = await userModel.selectUserByEmail(req.params.user_email);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.status(200).json(publicUser(user));
    } catch (error) {
      console.error("Erro ao buscar usuário por e-mail:", error);
      return res.status(500).json({ error: "Erro ao buscar usuário por e-mail" });
    }
  }

  async createUser(req, res) {
    try {
      const userName = req.body.user_name.trim();
      const userEmail = req.body.user_email.trim().toLowerCase();
      const hashedPassword = await bcrypt.hash(req.body.user_password, 12);

      const [existingUser] = await userModel.selectUserByEmail(userEmail);
      if (existingUser) {
        return res.status(409).json({ error: "Este e-mail já está cadastrado no sistema" });
      }

      const result = await userModel.insertUser({
        user_name: userName,
        user_email: userEmail,
        user_password: hashedPassword,
      });

      if (result.affectedRows !== 1) {
        return res.status(500).json({ error: "Não foi possível cadastrar o usuário" });
      }

      return res.status(201).json({
        success: "Usuário cadastrado com sucesso",
        user_id: result.insertId,
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Este e-mail já está cadastrado no sistema" });
      }

      console.error("Erro ao criar usuário:", error);
      return res.status(500).json({ error: "Erro ao criar usuário" });
    }
  }

  async updateUser(req, res) {
    try {
      const { user_id: userId } = req.params;
      const [currentUser] = await userModel.selectUserById(userId);

      if (!currentUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const userName = req.body.user_name.trim();
      const userEmail = req.body.user_email.trim().toLowerCase();
      const [existingUser] = await userModel.selectUserByEmail(userEmail, userId);

      if (existingUser) {
        return res.status(409).json({ error: "Este e-mail já está cadastrado no sistema" });
      }

      const userPassword = req.body.user_password
        ? await bcrypt.hash(req.body.user_password, 12)
        : currentUser.user_password;

      const result = await userModel.updateUser(userId, {
        user_name: userName,
        user_email: userEmail,
        user_password: userPassword,
      });

      if (result.affectedRows !== 1) {
        return res.status(400).json({ error: "Nenhuma alteração foi feita" });
      }

      return res.status(200).json({ success: "Usuário atualizado com sucesso" });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Este e-mail já está cadastrado no sistema" });
      }

      console.error("Erro ao atualizar usuário:", error);
      return res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  }

  async deleteUser(req, res) {
    try {
      const result = await userModel.deleteUser(req.params.user_id);

      if (result.affectedRows !== 1) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.status(200).json({ success: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      return res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  }
}

export default new RegisterController();

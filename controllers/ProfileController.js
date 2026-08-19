import usersModel from "../models/RegisterModel.js";

class ProfileController {
  async getProfile(req, res) {
    try {
      const [user] = await usersModel.selectUserById(Number(req.user?.id));
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      return res.status(200).json({
        id: user.user_id,
        name: user.user_name,
        email: user.user_email,
        allergies: user.allergies || [],
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({ error: "Erro ao buscar perfil" });
    }
  }
}

export default new ProfileController();

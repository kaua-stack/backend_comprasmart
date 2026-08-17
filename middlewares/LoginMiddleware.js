export default function validateLogin(req, res, next) {
  const { user_email, user_password } = req.body && typeof req.body === "object" ? req.body : {};

  if (typeof user_email !== "string" || !user_email.trim()) {
    return res.status(400).json({ error: "O e-mail é obrigatório" });
  }

  if (typeof user_password !== "string" || !user_password) {
    return res.status(400).json({ error: "A senha é obrigatória" });
  }

  return next();
}

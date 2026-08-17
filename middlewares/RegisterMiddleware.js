const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

function validateNameAndEmail(body, errors) {
  if (typeof body.user_name !== "string" || body.user_name.trim().length < 3 || body.user_name.trim().length > 150) {
    errors.push("O nome deve ter entre 3 e 150 caracteres");
  }

  if (typeof body.user_email !== "string" || !emailPattern.test(body.user_email.trim())) {
    errors.push("E-mail inválido");
  }
}

function validatePassword(password, errors, required = true) {
  if (password === undefined || password === null || password === "") {
    if (required) errors.push("A senha é obrigatória");
    return;
  }

  if (typeof password !== "string" || !passwordPattern.test(password)) {
    errors.push("A senha deve ter no mínimo 8 caracteres, contendo letra maiúscula, minúscula, número e caractere especial");
  }
}

function validateUser(req, res, next) {
  const errors = [];
  const body = req.body && typeof req.body === "object" ? req.body : {};

  validateNameAndEmail(body, errors);
  validatePassword(body.user_password, errors, true);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0] });
  }

  return next();
}

export function validateUserUpdate(req, res, next) {
  const errors = [];
  const body = req.body && typeof req.body === "object" ? req.body : {};

  validateNameAndEmail(body, errors);
  validatePassword(body.user_password, errors, false);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0] });
  }

  return next();
}

export default validateUser;

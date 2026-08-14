const validateUser = (req, res, next) => {
  const {
    user_name,
    user_email,
    user_password
  } = req.body;

  const errors = [];

  const newName = user_name?.trim();
  const newEmail = user_email?.trim();
  const newPassword = user_password?.trim();

  const regexEmail =
    /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const regexPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  // Nome
  if (!newName) {
    errors.push("O nome é obrigatório!");
  } else if (newName.length < 3 || newName.length > 150) {
    errors.push("O nome deve ter entre 3 e 150 caracteres!");
  }

  // Email
  if (!newEmail) {
    errors.push("O e-mail é obrigatório!");
  } else if (!regexEmail.test(newEmail)) {
    errors.push("E-mail inválido!");
  }

  // Senha
  if (!newPassword) {
    errors.push("A senha é obrigatória!");
  } else if (!regexPassword.test(newPassword)) {
    errors.push(
      "A senha deve ter no mínimo 8 caracteres, contendo letra maiúscula, minúscula, número e caractere especial!"
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: errors[0]
    });
  }

  next();
};

export default validateUser;
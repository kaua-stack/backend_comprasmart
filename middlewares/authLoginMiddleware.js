import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config()


// posso exportar como default colocando o export ao criar a constant ou classe
export const authenticationToken = (req, res, next) => {

    const getToken = req.headers.authorization;
    
    if(!getToken){

        return res.status(401).json({
            error:" token nao fornecido!"
        });
    }


    const bearerTokken = getToken.split(" ")[1];
    if (!bearerTokken) {
        return res.status(401).json({ error: "Token não fornecido" })
    }


    //
    jwt.verify(bearerTokken, process.env.ACCESS_TOKEN_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({ error: "Token inválido!" })
        }

        req.user = user

        next()
    });
};

export const adminRole = (...allowedRoles) => {

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Acesso negado. Função não autorizada." });
        }
        next();

    }
}

export default { authenticationToken, adminRole }
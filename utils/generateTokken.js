import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

class GenerateTokens {
    generateAccessToken(user) {
        const accessToken = jwt.sign(
            {
                id: user.user_id,
                email: user.user_email,
                role: user.role_name,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" },
        );

        return accessToken;
    }

    generateRefreshToken(user) {
        const refreshToken = jwt.sign(
            {
                id: user.user_id,
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" },
        );

        return refreshToken;
    }
}

export default new GenerateTokens();
const jwt = require('jsonwebtoken');
const config = require('../config');
const UserModel = require('../models/userModel');
const blacklist = require('../config/blacklist');
const UnauthorizedError = require('../errors/UnauthorizedError');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        throw new UnauthorizedError('Unauthorized: Missing token.');
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);

        if (blacklist.has(decoded.jti)) {
            throw new UnauthorizedError('Unauthorized: Token has been revoked.');
        }

        const user = await UserModel.findById(decoded.id);
        if (!user) {
            throw new UnauthorizedError('Unauthorized: User not found.');
        }

        req.user = {
            id: user.id,
            email: user.email,
            nick: user.nick,
            role: user.role,
            jti: decoded.jti,
            exp: decoded.exp
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedError('Unauthorized: Token expired.');
        }

        throw new UnauthorizedError('Unauthorized: Token has been revoked.');
    }
}

module.exports = authenticateToken;
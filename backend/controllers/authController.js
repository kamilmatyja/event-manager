const authService = require('../services/authService');
const blacklist = require('../config/blacklist');
const UnauthorizedError = require("../errors/UnauthorizedError");

const register = async (req, res) => {
    const {token, user} = await authService.register(req.body);

    res.status(201).json({token, user});
};

const login = async (req, res) => {
    const {email, password} = req.body;
    const {token, user} = await authService.login(email, password);

    res.status(200).json({token, user});
};

const logout = async (req, res) => {
    const userJti = req.user?.jti;
    const userExp = req.user?.exp;

    if (userJti && userExp) {
        blacklist.add(userJti, userExp);

        res.status(200).json({message: 'Logout successful. Token has been revoked.'});
    } else {
        throw new UnauthorizedError('Logout error: Could not retrieve token details.');
    }
};

const getCurrentUser = async (req, res) => {
    if (!req.user) {
        throw new UnauthorizedError('Unauthorized: User data not found in request.');
    }

    res.status(200).json(req.user);
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
};
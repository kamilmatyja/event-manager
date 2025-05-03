const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const config = require('../config');
const {ROLES} = require('../config/roles');
const {v4: uuidv4} = require('uuid');
const ConflictError = require("../errors/ConflictError");

const generateToken = (user) => {
    const payload = {
        id: user.id,
        nick: user.nick,
        role: user.role,
        jti: uuidv4(),
    };

    const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });

    const decodedForExp = jwt.decode(token);

    return {token, jti: payload.jti, exp: decodedForExp.exp};
};

const sanitizeUser = (user) => {
    if (!user) return null;
    const {password, ...sanitized} = user;
    return sanitized;
};

const register = async (userData) => {
    const {first_name, last_name, nick, email, password} = userData;

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
        throw new ConflictError('Email already exists.');
    }
    const existingNick = await UserModel.findByNick(nick);
    if (existingNick) {
        throw new ConflictError('Nick already exists.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserInput = {
        first_name,
        last_name,
        nick,
        email,
        password: hashedPassword,
        role: ROLES.MEMBER,

    };

    const newUser = await UserModel.create(newUserInput);

    const {token} = generateToken(newUser);

    return {token, user: sanitizeUser(newUser)};
};

const login = async (email, password) => {
    const user = await UserModel.findByEmail(email);
    if (!user) {
        throw new ConflictError('Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {

        throw new ConflictError('Invalid credentials.');
    }

    const {token} = generateToken(user);

    return {token, user: sanitizeUser(user)};
};

module.exports = {
    register,
    login,
    sanitizeUser,
};
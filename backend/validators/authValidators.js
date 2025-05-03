const {body} = require('express-validator');
const UserModel = require('../models/userModel');

const registerValidator = [
    body('first_name')
        .trim()
        .notEmpty().withMessage('First name is required.')
        .isLength({min: 5, max: 100}).withMessage('First name must be between 5 and 100 characters.'),

    body('last_name')
        .trim()
        .notEmpty().withMessage('Last name is required.')
        .isLength({min: 5, max: 100}).withMessage('Last name must be between 5 and 100 characters.'),

    body('nick')
        .trim()
        .notEmpty().withMessage('Nick is required.')
        .isLength({min: 5, max: 100}).withMessage('Nick must be between 5 and 100 characters.')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Nick can only contain letters, numbers, and underscores.')
        .custom(async (value) => {
            const user = await UserModel.findByNick(value);
            if (user) {
                return Promise.reject('Nick already exists.');
            }
        }),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Invalid email format.')
        .normalizeEmail()
        .custom(async (value) => {
            const user = await UserModel.findByEmail(value);
            if (user) {
                return Promise.reject('Email already exists.');
            }
        }),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required.')
        .isLength({min: 8}).withMessage('Password must be at least 8 characters long.')
        .matches(/\d/).withMessage('Password must contain at least one number.')
        .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter.'),
];

const loginValidator = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Invalid email format.')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required.'),
];

module.exports = {
    registerValidator,
    loginValidator,
};
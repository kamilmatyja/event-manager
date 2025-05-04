const {body, param} = require('express-validator');
const UserModel = require('../models/userModel');
const {ROLES} = require('../config/roles');

const allowedRoles = Object.values(ROLES);

const validateId = [
    param('id')
        .isInt({gt: 0}).withMessage('Invalid user ID. ID must be a positive integer.')
];

const userIdValidator = [
    ...validateId
];

const createUserValidator = [
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
            return true;
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
            return true;
        }),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required.')
        .isLength({min: 8}).withMessage('Password must be at least 8 characters long.')
        .matches(/\d/).withMessage('Password must contain at least one number.')
        .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter.'),

    body('role')
        .notEmpty().withMessage('Role is required.')
        .isInt().withMessage('Role must be an integer.')
        .isIn(allowedRoles).withMessage(`Role must be one of: ${allowedRoles.join(', ')} (Member=${ROLES.MEMBER}, Prelegent=${ROLES.PRELEGENT}, Admin=${ROLES.ADMINISTRATOR})`)
];

const updateUserValidator = [
    ...validateId,

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
        .custom(async (value, {req}) => {
            const user = await UserModel.findByNick(value);
            if (user && user.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Nick already exists.');
            }
            return true;
        }),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Invalid email format.')
        .normalizeEmail()
        .custom(async (value, {req}) => {
            const user = await UserModel.findByEmail(value);
            if (user && user.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Email already exists.');
            }
            return true;
        }),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required.')
        .isLength({min: 8}).withMessage('Password must be at least 8 characters long.')
        .matches(/\d/).withMessage('Password must contain at least one number.')
        .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter.'),

    body('role')
        .notEmpty().withMessage('Role is required.')
        .isInt().withMessage('Role must be an integer.')
        .isIn(allowedRoles).withMessage(`Role must be one of: ${allowedRoles.join(', ')}`)
];

const deleteUserValidator = [
    ...validateId,
    param('id').custom((value, {req}) => {
        if (parseInt(value, 10) === req.user.id) {
            return Promise.reject('Cannot delete your own account.');
        }
        return true;
    })
];

module.exports = {
    userIdValidator,
    createUserValidator,
    updateUserValidator,
    deleteUserValidator,
};
const userService = require('../services/userService');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const getAllUsers = async (req, res) => {
    const users = await userService.findAllUsers();
    res.status(200).json(users);
};

const getUserById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid user ID format.');
    }
    const user = await userService.findUserById(id);
    if (!user) {
        throw new NotFoundError('User not found');
    }
    res.status(200).json(user);
};

const createUser = async (req, res) => {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
};

const updateUser = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid user ID format.');
    }

    const updatedUser = await userService.updateUser(id, req.body);
    if (!updatedUser) {
        throw new NotFoundError('User not found');
    }
    res.status(200).json(updatedUser);
};

const deleteUser = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid user ID format.');
    }

    if (req.user.id === id) {
        throw new BadRequestError('Cannot delete your own account.');
    }

    const success = await userService.deleteUser(id);
    if (!success) {
        throw new NotFoundError('User not found');
    }
    res.status(204).send();
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
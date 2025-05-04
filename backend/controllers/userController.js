const userService = require('../services/userService');
const NotFoundError = require("../errors/NotFoundError");

const getAllUsers = async (req, res) => {
    const users = await userService.findAllUsers();

    res.status(200).json(users);
};

const getUserById = async (req, res) => {
    const user = await userService.findUserById(req.params.id);

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
    const updatedUser = await userService.updateUser(req.params.id, req.body);

    if (!updatedUser) {
        throw new NotFoundError('User not found');
    }

    res.status(200).json(updatedUser);
};

const deleteUser = async (req, res) => {
    const success = await userService.deleteUser(req.params.id);

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
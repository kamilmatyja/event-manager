const prelegentService = require('../services/prelegentService');
const NotFoundError = require("../errors/NotFoundError");

const getAllPrelegents = async (req, res) => {
    const prelegents = await prelegentService.findAllPrelegents();

    res.status(200).json(prelegents);
};

const getPrelegentById = async (req, res) => {
    const prelegent = await prelegentService.findPrelegentById(req.params.id);

    if (!prelegent) {
        throw new NotFoundError('Prelegent not found');
    }

    res.status(200).json(prelegent);
};

const createPrelegent = async (req, res) => {
    const newPrelegent = await prelegentService.createPrelegent(req.body);

    res.status(201).json(newPrelegent);
};

const updatePrelegent = async (req, res) => {
    const updatedPrelegent = await prelegentService.updatePrelegent(req.params.id, req.body);

    if (!updatedPrelegent) {
        throw new NotFoundError('Prelegent not found');
    }

    res.status(200).json(updatedPrelegent);
};

const deletePrelegent = async (req, res) => {
    const success = await prelegentService.deletePrelegent(req.params.id);

    if (!success) {
        throw new NotFoundError('Prelegent not found');
    }

    res.status(204).send();
};

module.exports = {
    getAllPrelegents,
    getPrelegentById,
    createPrelegent,
    updatePrelegent,
    deletePrelegent,
};
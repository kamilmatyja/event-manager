const prelegentService = require('../services/prelegentService');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const getAllPrelegents = async (req, res) => {
    const prelegents = await prelegentService.findAllPrelegents();
    res.status(200).json(prelegents);
};

const getPrelegentById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid prelegent ID format.');
    }
    const prelegent = await prelegentService.findPrelegentById(id);
    if (!prelegent) {
        throw new NotFoundError('Prelegent not found');
    }
    res.status(200).json(prelegent);
};

const createPrelegent = async (req, res) => {
    const newPrelegent = await prelegentService.createPrelegent(req.body);

    const prelegentWithDetails = await prelegentService.findPrelegentById(newPrelegent.id);
    res.status(201).json(prelegentWithDetails);
};

const updatePrelegent = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid prelegent ID format.');
    }

    const updatedPrelegent = await prelegentService.updatePrelegent(id, req.body);
    if (!updatedPrelegent) {
        throw new NotFoundError('Prelegent not found');
    }
    res.status(200).json(updatedPrelegent);
};

const deletePrelegent = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid prelegent ID format.');
    }
    const success = await prelegentService.deletePrelegent(id);
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
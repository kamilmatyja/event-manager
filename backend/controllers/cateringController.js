const cateringService = require('../services/cateringService');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const getAllCaterings = async (req, res) => {
    const caterings = await cateringService.findAllCaterings();
    res.status(200).json(caterings);
};

const getCateringById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid catering ID format.');
    }
    const catering = await cateringService.findCateringById(id);
    if (!catering) {
        throw new NotFoundError('Catering not found');
    }
    res.status(200).json(catering);
};

const createCatering = async (req, res) => {
    const newCatering = await cateringService.createCatering(req.body);
    res.status(201).json(newCatering);
};

const updateCatering = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid catering ID format.');
    }

    const updatedCatering = await cateringService.updateCatering(id, req.body);
    if (!updatedCatering) {
        throw new NotFoundError('Catering not found');
    }
    res.status(200).json(updatedCatering);
};

const deleteCatering = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid catering ID format.');
    }
    const success = await cateringService.deleteCatering(id);
    if (!success) {
        throw new NotFoundError('Catering not found');
    }
    res.status(204).send();
};

module.exports = {
    getAllCaterings,
    getCateringById,
    createCatering,
    updateCatering,
    deleteCatering,
};
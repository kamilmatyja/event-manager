const cateringService = require('../services/cateringService');
const NotFoundError = require("../errors/NotFoundError");

const getAllCaterings = async (req, res) => {
    const caterings = await cateringService.findAllCaterings();

    res.status(200).json(caterings);
};

const getCateringById = async (req, res) => {
    const catering = await cateringService.findCateringById(req.params.id);

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
    const updatedCatering = await cateringService.updateCatering(req.params.id, req.body);

    if (!updatedCatering) {
        throw new NotFoundError('Catering not found');
    }

    res.status(200).json(updatedCatering);
};

const deleteCatering = async (req, res) => {
    const success = await cateringService.deleteCatering(req.params.id);

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
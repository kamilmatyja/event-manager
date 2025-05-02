const sponsorService = require('../services/sponsorService');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const getAllSponsors = async (req, res) => {
    const sponsors = await sponsorService.findAllSponsors();
    res.status(200).json(sponsors);
};

const getSponsorById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid sponsor ID format.');
    }
    const sponsor = await sponsorService.findSponsorById(id);
    if (!sponsor) {
        throw new NotFoundError('Sponsor not found');
    }
    res.status(200).json(sponsor);
};

const createSponsor = async (req, res) => {
    const newSponsor = await sponsorService.createSponsor(req.body);
    res.status(201).json(newSponsor);
};

const updateSponsor = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid sponsor ID format.');
    }

    const updatedSponsor = await sponsorService.updateSponsor(id, req.body);
    if (!updatedSponsor) {
        throw new NotFoundError('Sponsor not found');
    }
    res.status(200).json(updatedSponsor);
};

const deleteSponsor = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid sponsor ID format.');
    }
    const success = await sponsorService.deleteSponsor(id);
    if (!success) {
        throw new NotFoundError('Sponsor not found');
    }
    res.status(204).send();
};

module.exports = {
    getAllSponsors,
    getSponsorById,
    createSponsor,
    updateSponsor,
    deleteSponsor,
};
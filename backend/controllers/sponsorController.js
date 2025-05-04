const sponsorService = require('../services/sponsorService');
const NotFoundError = require("../errors/NotFoundError");

const getAllSponsors = async (req, res) => {
    const sponsors = await sponsorService.findAllSponsors();

    res.status(200).json(sponsors);
};

const getSponsorById = async (req, res) => {
    const sponsor = await sponsorService.findSponsorById(req.params.id);

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
    const updatedSponsor = await sponsorService.updateSponsor(req.params.id, req.body);

    if (!updatedSponsor) {
        throw new NotFoundError('Sponsor not found');
    }

    res.status(200).json(updatedSponsor);
};

const deleteSponsor = async (req, res) => {
    const success = await sponsorService.deleteSponsor(req.params.id);

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
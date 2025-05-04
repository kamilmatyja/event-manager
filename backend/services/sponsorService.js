const sponsorModel = require('../models/sponsorModel');
const eventSponsorModel = require('../models/eventSponsorModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const findAllSponsors = async () => {
    return await sponsorModel.findAll();
};

const findSponsorById = async (id) => {
    const sponsor = await sponsorModel.findById(id);

    if (!sponsor) {
        throw new NotFoundError(`Sponsor with ID ${id} not found.`);
    }

    return sponsor;
};

const createSponsor = async (sponsorData) => {
    return await sponsorModel.create(sponsorData);
};

const updateSponsor = async (id, sponsorData) => {
    const sponsor = await sponsorModel.findById(id);

    if (!sponsor) {
        throw new NotFoundError(`Sponsor with ID ${id} not found.`);
    }

    return await sponsorModel.update(id, sponsorData);
};

const deleteSponsor = async (id) => {
    const sponsor = await sponsorModel.findById(id);

    if (!sponsor) {
        throw new NotFoundError(`Sponsor with ID ${id} not found.`);
    }

    const usageCount = await eventSponsorModel.countBySponsorId(id);

    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete sponsor: It is assigned to ${usageCount} event(s).`);
    }

    return await sponsorModel.deleteById(id) > 0;
};

module.exports = {
    findAllSponsors,
    findSponsorById,
    createSponsor,
    updateSponsor,
    deleteSponsor,
};
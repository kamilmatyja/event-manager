const sponsorModel = require('../models/sponsorModel');
const eventSponsorModel = require('../models/eventSponsorModel');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const findAllSponsors = async () => {
    return await sponsorModel.findAll();
};

const findSponsorById = async (id) => {
    const sponsor = await sponsorModel.findById(id);
    if (!sponsor) {
        throw new NotFoundError('Sponsor not found.');
    }
    return sponsor;
};

const createSponsor = async (sponsorData) => {
    const existingName = await sponsorModel.findByName(sponsorData.name);
    if (existingName) {
        throw new ConflictError('Sponsor name already exists.');
    }
    const existingDesc = await sponsorModel.findByDescription(sponsorData.description);
    if (existingDesc) {
        throw new ConflictError('Sponsor description already exists.');
    }
    return await sponsorModel.create(sponsorData);
};

const updateSponsor = async (id, sponsorData) => {
    const currentSponsor = await findSponsorById(id);

    if (sponsorData.name && sponsorData.name !== currentSponsor.name) {
        const existingName = await sponsorModel.findByName(sponsorData.name);
        if (existingName) {
            throw new ConflictError('Sponsor name already exists.');
        }
    }
    if (sponsorData.description && sponsorData.description !== currentSponsor.description) {
        const existingDesc = await sponsorModel.findByDescription(sponsorData.description);
        if (existingDesc) {
            throw new ConflictError('Sponsor description already exists.');
        }
    }

    const dataToUpdate = {};
    if (sponsorData.name !== undefined) dataToUpdate.name = sponsorData.name;
    if (sponsorData.description !== undefined) dataToUpdate.description = sponsorData.description;

    if (Object.keys(dataToUpdate).length === 0) {
        return currentSponsor;
    }

    const updatedSponsor = await sponsorModel.update(id, dataToUpdate);
    if (!updatedSponsor) {
        throw new NotFoundError('Sponsor not found during update.');
    }
    return updatedSponsor;
};

const deleteSponsor = async (id) => {
    await findSponsorById(id);

    const usageCount = await eventSponsorModel.countBySponsorId(id);
    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete sponsor: It is assigned to ${usageCount} event(s).`);
    }

    const deletedCount = await sponsorModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllSponsors,
    findSponsorById,
    createSponsor,
    updateSponsor,
    deleteSponsor,
};
const resourceModel = require('../models/resourceModel');
const eventResourceModel = require('../models/eventResourceModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const findAllResources = async () => {
    return await resourceModel.findAll();
};

const findResourceById = async (id) => {
    const resource = await resourceModel.findById(id);

    if (!resource) {
        throw new NotFoundError(`Resource with ID ${id} not found.`);
    }

    return resource;
};

const createResource = async (resourceData) => {
    return await resourceModel.create(resourceData);
};

const updateResource = async (id, resourceData) => {
    const resource = await resourceModel.findById(id);

    if (!resource) {
        throw new NotFoundError(`Resource with ID ${id} not found.`);
    }

    return await resourceModel.update(id, resourceData);
};

const deleteResource = async (id) => {
    const resource = await resourceModel.findById(id);

    if (!resource) {
        throw new NotFoundError(`Resource with ID ${id} not found.`);
    }

    const usageCount = await eventResourceModel.countByResourceId(id);

    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete resource: It is assigned to ${usageCount} event(s).`);
    }

    return await resourceModel.deleteById(id) > 0;
};

module.exports = {
    findAllResources,
    findResourceById,
    createResource,
    updateResource,
    deleteResource,
};
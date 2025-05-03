const resourceModel = require('../models/resourceModel');
const eventResourceModel = require('../models/eventResourceModel');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const findAllResources = async () => {
    return await resourceModel.findAll();
};

const findResourceById = async (id) => {
    const resource = await resourceModel.findById(id);
    if (!resource) {
        throw new NotFoundError('Resource not found.');
    }
    return resource;
};

const createResource = async (resourceData) => {
    const existingName = await resourceModel.findByName(resourceData.name);
    if (existingName) {
        throw new ConflictError('Resource name already exists.');
    }
    const existingDesc = await resourceModel.findByDescription(resourceData.description);
    if (existingDesc) {
        throw new ConflictError('Resource description already exists.');
    }
    return await resourceModel.create(resourceData);
};

const updateResource = async (id, resourceData) => {
    const currentResource = await findResourceById(id);

    if (resourceData.name && resourceData.name !== currentResource.name) {
        const existingName = await resourceModel.findByName(resourceData.name);
        if (existingName) {
            throw new ConflictError('Resource name already exists.');
        }
    }
    if (resourceData.description && resourceData.description !== currentResource.description) {
        const existingDesc = await resourceModel.findByDescription(resourceData.description);
        if (existingDesc) {
            throw new ConflictError('Resource description already exists.');
        }
    }

    const dataToUpdate = {};
    if (resourceData.name !== undefined) dataToUpdate.name = resourceData.name;
    if (resourceData.description !== undefined) dataToUpdate.description = resourceData.description;

    if (Object.keys(dataToUpdate).length === 0) {
        return currentResource;
    }

    const updatedResource = await resourceModel.update(id, dataToUpdate);
    if (!updatedResource) {
        throw new NotFoundError('Resource not found during update.');
    }
    return updatedResource;
};

const deleteResource = async (id) => {
    await findResourceById(id);

    const usageCount = await eventResourceModel.countByResourceId(id);
    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete resource: It is assigned to ${usageCount} event(s).`);
    }

    const deletedCount = await resourceModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllResources,
    findResourceById,
    createResource,
    updateResource,
    deleteResource,
};
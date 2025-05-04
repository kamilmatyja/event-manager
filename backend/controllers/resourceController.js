const resourceService = require('../services/resourceService');
const NotFoundError = require("../errors/NotFoundError");

const getAllResources = async (req, res) => {
    const resources = await resourceService.findAllResources();

    res.status(200).json(resources);
};

const getResourceById = async (req, res) => {
    const resource = await resourceService.findResourceById(req.params.id);

    if (!resource) {
        throw new NotFoundError('Resource not found');
    }

    res.status(200).json(resource);
};

const createResource = async (req, res) => {
    const newResource = await resourceService.createResource(req.body);

    res.status(201).json(newResource);
};

const updateResource = async (req, res) => {
    const updatedResource = await resourceService.updateResource(req.params.id, req.body);

    if (!updatedResource) {
        throw new NotFoundError('Resource not found');
    }

    res.status(200).json(updatedResource);
};

const deleteResource = async (req, res) => {
    const success = await resourceService.deleteResource(req.params.id);

    if (!success) {
        throw new NotFoundError('Resource not found');
    }

    res.status(204).send();
};

module.exports = {
    getAllResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource,
};
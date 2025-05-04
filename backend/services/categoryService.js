const categoryModel = require('../models/categoryModel');
const eventModel = require('../models/eventModel');
const ConflictError = require('../errors/ConflictError');
const NotFoundError = require('../errors/NotFoundError');

const findAllCategories = async () => {
    return await categoryModel.findAll();
};

const findCategoryById = async (id) => {
    const category = await categoryModel.findById(id);

    if (!category) {
        throw new NotFoundError(`Category with ID ${id} not found.`);
    }

    return category;
};

const createCategory = async (categoryData) => {
    return await categoryModel.create(categoryData);
};

const updateCategory = async (id, categoryData) => {
    const category = await categoryModel.findById(id);

    if (!category) {
        throw new NotFoundError(`Category with ID ${id} not found.`);
    }

    return await categoryModel.update(id, categoryData);
};

const deleteCategory = async (id) => {
    const category = await categoryModel.findById(id);

    if (!category) {
        throw new NotFoundError(`Category with ID ${id} not found.`);
    }

    const usageCount = await eventModel.countByCategoryId(id);

    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete category: It is used by ${usageCount} event(s).`);
    }

    return await categoryModel.deleteById(id) > 0;
};

module.exports = {
    findAllCategories,
    findCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
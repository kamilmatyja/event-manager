const categoryModel = require('../models/categoryModel');
const eventModel = require('../models/eventModel');
const ConflictError = require("../errors/ConflictError");
const NotFoundError = require("../errors/NotFoundError");

const findAllCategories = async () => {
    return await categoryModel.findAll();
};

const findCategoryById = async (id) => {
    return await categoryModel.findById(id);
};

const createCategory = async (categoryData) => {
    const existingName = await categoryModel.findByName(categoryData.name);
    if (existingName) {
        throw new ConflictError('Category name already exists.');
    }
    const existingDesc = await categoryModel.findByDescription(categoryData.description);
    if (existingDesc) {
        throw new ConflictError('Category description already exists.');
    }
    return await categoryModel.create(categoryData);
};

const updateCategory = async (id, categoryData) => {

    const currentCategory = await categoryModel.findById(id);
    if (!currentCategory) {
        return null;
    }

    if (categoryData.name && categoryData.name !== currentCategory.name) {
        const existingName = await categoryModel.findByName(categoryData.name);
        if (existingName) {
            throw new ConflictError('Category name already exists.');
        }
    }
    if (categoryData.description && categoryData.description !== currentCategory.description) {
        const existingDesc = await categoryModel.findByDescription(categoryData.description);
        if (existingDesc) {
            throw new ConflictError('Category description already exists.');
        }
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

    const deletedCount = await categoryModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllCategories,
    findCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
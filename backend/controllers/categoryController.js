const categoryService = require('../services/categoryService');
const NotFoundError = require("../errors/NotFoundError");

const getAllCategories = async (req, res) => {
    const categories = await categoryService.findAllCategories();

    res.status(200).json(categories);
};

const getCategoryById = async (req, res) => {
    const category = await categoryService.findCategoryById(req.params.id);

    if (!category) {
        throw new NotFoundError('Category not found');
    }

    res.status(200).json(category);
};

const createCategory = async (req, res) => {
    const newCategory = await categoryService.createCategory(req.body);

    res.status(201).json(newCategory);
};

const updateCategory = async (req, res) => {
    const updatedCategory = await categoryService.updateCategory(req.params.id, req.body);

    if (!updatedCategory) {
        throw new NotFoundError('Category not found');
    }

    res.status(200).json(updatedCategory);
};

const deleteCategory = async (req, res) => {
    const success = await categoryService.deleteCategory(req.params.id);

    if (!success) {
        throw new NotFoundError('Category not found');
    }

    res.status(204).send();
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
const {body, param} = require('express-validator');
const SponsorModel = require('../models/sponsorModel');

const validateId = [
    param('id')
        .isInt({gt: 0}).withMessage('Invalid sponsor ID. ID must be a positive integer.')
];

const sponsorIdValidator = [
    ...validateId
];

const createSponsorValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Sponsor name is required.')
        .isLength({min: 5, max: 100}).withMessage('Sponsor name must be between 5 and 100 characters.')
        .custom(async (value) => {
            const sponsor = await SponsorModel.findByName(value);
            if (sponsor) {
                return Promise.reject('Sponsor name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Sponsor description is required.')
        .custom(async (value) => {
            const sponsor = await SponsorModel.findByDescription(value);
            if (sponsor) {
                return Promise.reject('Sponsor description already exists.');
            }
            return true;
        }),
];

const updateSponsorValidator = [
    ...sponsorIdValidator,

    body('name')
        .trim()
        .notEmpty().withMessage('Sponsor name is required.')
        .isLength({min: 5, max: 100}).withMessage('Sponsor name must be between 5 and 100 characters.')
        .custom(async (value, {req}) => {
            const sponsor = await SponsorModel.findByName(value);
            if (sponsor && sponsor.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Sponsor name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Sponsor description is required.')
        .custom(async (value, {req}) => {
            const sponsor = await SponsorModel.findByDescription(value);
            if (sponsor && sponsor.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Sponsor description already exists.');
            }
            return true;
        }),
];

module.exports = {
    sponsorIdValidator,
    createSponsorValidator,
    updateSponsorValidator,
};
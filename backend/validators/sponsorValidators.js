const {body, param} = require('express-validator');
const SponsorModel = require('../models/sponsorModel');

const createSponsorValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Sponsor name is required.')
        .isLength({min: 2, max: 100}).withMessage('Sponsor name must be between 2 and 100 characters.')
        .custom(async (value) => {
            const sponsor = await SponsorModel.findByName(value);
            if (sponsor) {
                return Promise.reject('Sponsor name already exists.');
            }
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Sponsor description is required.')
        .custom(async (value) => {
            const sponsor = await SponsorModel.findByDescription(value);
            if (sponsor) {
                return Promise.reject('Sponsor description already exists.');
            }
        }),
];

const updateSponsorValidator = [
    param('id').isInt({gt: 0}).withMessage('Invalid sponsor ID.'),

    body('name')
        .trim()
        .notEmpty().withMessage('Sponsor name is required.')
        .isLength({min: 2, max: 100}).withMessage('Sponsor name must be between 2 and 100 characters.')
        .custom(async (value, {req}) => {
            const sponsor = await SponsorModel.findByName(value);
            if (sponsor && sponsor.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Sponsor name already exists.');
            }
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Sponsor description is required.')
        .custom(async (value, {req}) => {
            const sponsor = await SponsorModel.findByDescription(value);
            if (sponsor && sponsor.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Sponsor description already exists.');
            }
        }),
];

module.exports = {
    createSponsorValidator,
    updateSponsorValidator,
};
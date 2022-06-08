import httpMocks from 'node-mocks-http';
import faker from 'faker';
import * as validator from 'express-validator';
import { validate } from '../validator.js';

jest.mock('express-validator');

describe('Validator Middlewear', () => {
    // Success
    it('calls next if there are no validation errors', () => {
        const request = httpMocks.createRequest();
        const response = httpMocks.createResponse();
        const next = jest.fn();
        validator.validationResult = jest.fn(() => ({ isEmpty: () => true }));

        validate(request, response, next);

        expect(next).toBeCalled();
    })
    it('returns 400 if there are validation errors', () => {
        const request = httpMocks.createRequest();
        const response = httpMocks.createResponse();
        const next = jest.fn();
        const errorMessage = faker.random.words(3);
        validator.validationResult = jest.fn(() => ({ 
            isEmpty: () => false, 
            array: () => [{ msg: errorMessage }] 
        }));

        validate(request, response, next);

        expect(next).not.toBeCalled();
        expect(response.statusCode).toBe(400);
        expect(response._getJSONData().message).toBe(errorMessage);
    });
});
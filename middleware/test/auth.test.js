import httpMocks from 'node-mocks-http';
import { isAuth } from '../auth.js';
import faker from 'faker';
import jwt from 'jsonwebtoken';
import * as userRepository from '../../data/auth.js';

jest.mock('jsonwebtoken');
jest.mock('../../data/auth.js');

describe('Auth Middlewear', () => {
    // Fail
    it('returns 401 for the request without Authorization header', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
        });
        const response = httpMocks.createResponse();
        const next = jest.fn();

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        // 401 error시에 다음 로직으로 넘어가지 않도록!! -> next() x
        // expect(next).toHaveBeenCalled(0)
        expect(next).not.toBeCalled();
    });

    it('returns 401 for the request with unsupported Authorization header', async () => {
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: 'Basic' },
        });
        const response = httpMocks.createResponse();
        const next = jest.fn();

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).not.toBeCalled();
    });

    it('returns 401 for the request with invalid token', async () => {
        const token = faker.random.alphaNumeric(128); 
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: `Bearer ${token}` },
        });
        const response = httpMocks.createResponse();
        const next = jest.fn();
        jwt.verify = jest.fn((token, secret, callback) => {
            callback(new Error('bad token'), undefined);
        });

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).not.toBeCalled();
    });

    it('returns 401 when cannot find a user by id from the JWT', async () => {
        const token = faker.random.alphaNumeric(128); 
        const userId = faker.random.alphaNumeric(32);
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: `Bearer ${token}` },
        });
        const response = httpMocks.createResponse();
        const next = jest.fn();
        jwt.verify = jest.fn((token, secret, callback) => {
            callback(undefined, { id: userId });
        });
        userRepository.findById = jest.fn((id) => Promise.resolve(undefined));

        await isAuth(request, response, next);

        expect(response.statusCode).toBe(401);
        expect(response._getJSONData().message).toBe('Authentication Error');
        expect(next).not.toBeCalled();
    });

    // Success
    it('passes a request with valid Authorization header with token', async () => {
        const token = faker.random.alphaNumeric(128); 
        const userId = faker.random.alphaNumeric(32);
        const request = httpMocks.createRequest({
            method: 'GET',
            url: '/tweets',
            headers: { Authorization: `Bearer ${token}` },
        });
        const response = httpMocks.createResponse();
        const next = jest.fn();
        jwt.verify = jest.fn((token, secret, callback) => {
            callback(undefined, { id: userId });
        });
        userRepository.findById = jest.fn((id) => Promise.resolve({id}));

        await isAuth(request, response, next);

        expect(request).toMatchObject({ userId, token });
        expect(next).toHaveBeenCalledTimes(1);
    });
})
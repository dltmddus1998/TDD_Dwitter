import faker from 'faker';
import { TweetController } from '../tweet.js';
import httpMocks from 'node-mocks-http';

describe('TweetController', () => {
    let tweetController;
    let tweetsRepository;
    let mockedSocket;
    beforeEach(() => {
        tweetsRepository = {};
        mockedSocket = { emit: jest.fn() };
        tweetController = new TweetController(
            tweetsRepository,
            () => mockedSocket
        );
    });

    // getTweets
    describe('getTweets', () => {
        it('returns all tweets when username is not provided', async () => {
            const request = httpMocks.createRequest();
            const response = httpMocks.createResponse();
            const allTweets = [
                {text: faker.random.words(3)},
                {text: faker.random.words(3)}
            ];
            tweetsRepository.getAll = () => allTweets;

            await tweetController.getTweets(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual(allTweets);
        });

        it ('returns all tweets for the given user when username is provided', async () => {
            const username = faker.internet.userName();
            const request = httpMocks.createRequest({
                query: { username },
            });
            const response = httpMocks.createResponse();
            const userTweets = [
                {text: faker.random.words(3)}
            ];
            tweetsRepository.getAllByUsername = jest.fn(() => userTweets);

            await tweetController.getTweets(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual(userTweets);
            expect(tweetsRepository.getAllByUsername).toHaveBeenCalledWith(username);
        });
    });

    // getTweet
    describe('getTweet', () => { 
        let tweetId, request, response, next;

        beforeEach(() => {
            tweetId = faker.random.alphaNumeric(16);
            request = httpMocks.createRequest({
                params: { id: tweetId }
            });
            response = httpMocks.createResponse();
            next = jest.fn();
        });

        it('returns the tweet if tweet exists', async () => {
            const aTweet = { text: faker.random.words(3) };
            tweetsRepository.getById = jest.fn(() => aTweet);

            await tweetController.getTweet(request, response, next);

            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toEqual(aTweet);
            expect(tweetsRepository.getById).toHaveBeenCalledWith(tweetId);
        });

        it("returns 404 error if tweet isn't exist", async () => {
            tweetsRepository.getById = jest.fn(() =>  undefined);

            await tweetController.getTweet(request, response, next);

            expect(response.statusCode).toBe(404);
            expect(response._getJSONData()).toMatchObject({
                message: `Tweet id(${tweetId}) not found`
            });
            expect(tweetsRepository.getById).toHaveBeenCalledWith(tweetId);
        });
    });

    // createTweet
    describe('createTweet', () => {
        let newTweet, authorId, request, response, next;
        beforeEach(() => {
            newTweet = faker.random.words(3);
            authorId = faker.random.alphaNumeric(16);
            request = httpMocks.createRequest({
                body: { text: newTweet },
                userId: authorId,
            });
            response = httpMocks.createResponse();
            next = jest.fn();
        });

        it('returns 201 with created tweet object including userId', async () => {
            tweetsRepository.create = jest.fn((text, userId) => {
                return {
                    text,
                    userId,
                };
            });

            await tweetController.createTweet(request, response, next);

            expect(response.statusCode).toBe(201);
            console.log(response._getJSONData());
            expect(response._getJSONData()).toMatchObject({
                text: newTweet,
                userId: authorId,
            });
            expect(tweetsRepository.create).toHaveBeenCalledWith(newTweet, authorId);
        });

        it('should send an event to a websocket channel', async () => {
            tweetsRepository.create = jest.fn((text, userId) => {
                return {
                    text, 
                    userId,
                };
            });

            await tweetController.createTweet(request, response);
            
            expect(mockedSocket.emit).toHaveBeenCalledWith('tweets', {
                text: newTweet,
                userId: authorId,
            });
        });
    });

    // updateTweet
    describe('updateTweet', () => {
        let tweetId, authorId, updatedText, request, response;
        beforeEach(() => {
            updatedText = faker.random.words(3);
            tweetId = faker.random.alphaNumeric(16);
            authorId = faker.random.alphaNumeric(16);
            request = httpMocks.createRequest({
                body: { text: updatedText },
                params: { id: tweetId },
                userId: authorId,
            });
            response = httpMocks.createResponse();
        });

        it('returns 200 with updated tweet object including userId', async () => {
            tweetsRepository.getById = () => ({
                text: faker.random.words(3),
                userId: authorId,
            });
            tweetsRepository.update = (tweetId, newText) => ({
                text: newText
            });

            await tweetController.updateTweet(request, response);

            expect(response.statusCode).toBe(200);
            expect(response._getJSONData()).toMatchObject({
                text: updatedText,
            });
        });

        it('returns 403 and should not update the repository if the tweet does not belong to the user', async () => {
            tweetsRepository.getById = () => ({
                text: faker.random.words(3),
                userId: faker.random.alphaNumeric(16),
            });
            tweetsRepository.udpate = jest.fn();

            await tweetController.updateTweet(request, response);

            expect(response.statusCode).toBe(403);
        });

        it('returns 404 and should not update the repository if the tweet does not exist', async () => {
            tweetsRepository.getById = () => undefined;
            tweetsRepository.update = jest.fn();

            await tweetController.updateTweet(request, response);

            expect(response.statusCode).toBe(404);
            expect(response._getJSONData().message).toBe(`Tweet not found: ${tweetId}`);
        });
    });

    // deleteTweet
    describe('deleteTweet', () => {
        let tweetId, authorId, request, response;
        beforeEach(() => {
            tweetId = faker.random.alphaNumeric(16);
            authorId = faker.random.alphaNumeric(16);
            request = httpMocks.createRequest({
                params: { id: tweetId },
                userId: authorId,
            });
            response = httpMocks.createResponse();
        });

        it('returns 204 and remove the tweet from the repository if the tweet exists', async () => {
            tweetsRepository.getById = () => ({
                userId: authorId,
            });
            tweetsRepository.remove = jest.fn();

            await tweetController.deleteTweet(request, response);

            expect(response.statusCode).toBe(204);
            expect(tweetsRepository.remove).toHaveBeenCalledWith(tweetId);
        });

        it('returns 403 and should not update the repository if the tweet does not belong to the user', async () => {
            tweetsRepository.getById = () => ({
                userId: faker.random.alphaNumeric(16),
            });
            tweetsRepository.remove = jest.fn();

            await tweetController.deleteTweet(request, response);

            expect(response.statusCode).toBe(403);
            expect(tweetsRepository.remove).not.toHaveBeenCalled();
        });

        it('returns 404 and should not update the repository if the tweet does not exist', async () => {
            tweetsRepository.getById = () => undefined;
            tweetsRepository.remove = jest.fn();

            await tweetController.deleteTweet(request, response);

            expect(response.statusCode).toBe(404);
            expect(response._getJSONData().message).toBe(`Tweet not found: ${tweetId}`);
            expect(tweetsRepository.remove).not.toHaveBeenCalled();
        });
    });
});
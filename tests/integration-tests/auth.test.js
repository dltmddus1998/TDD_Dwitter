// 테스트 전! 서버 시작 및 데이터베이스 초기화! 설정
// 테스트 후! 데이터베이스 깨끗하게 청소해놓기
import { sequelize } from '../../db/database.js';
import { startServer, stopServer } from '../../app.js';
import axios from 'axios';
import faker from 'faker';
import { createNewUserAccount, makeValidUserDetails } from './auth_utils.js';

describe('Auth APIs', () => {
    let server;
    let request;
    // server start
    // 서버는 비동기 -> async/await 사용
    beforeAll(async () => {
        server = await startServer();
        request = axios.create({
            baseURL: `http://localhost:${server.address().port}`,
            validateStatus: null,
        });
    });

    // 데이터베이스&서버 초기화 
    afterAll(async () => { 
        await stopServer(server);
    });

    describe('POST to /auth/signup', () => {
        it('returns 201 and authorization token when user details are valid', async () => {
            const user = makeValidUserDetails();
            const res = await request.post('/auth/signup', user);

            expect(res.status).toBe(201);
            expect(res.data.token.length).toBeGreaterThan(0);
        });

        it('returns 409 when username has already been taken', async () => {
            const user = makeValidUserDetails();
            const firstSignup = await request.post('/auth/signup', user);

            expect(firstSignup.status).toBe(201);

            const res = await request.post('/auth/signup', user);

            expect(res.status).toBe(409);
            expect(res.data.message).toBe(`${user.username} already exists`);
        });

        test.each([
            { missingFieldName: 'name', expectedMessage: 'name is missing' },
            { 
                missingFieldName: 'username', 
                expectedMessage: 'username should be at least 5 characters'},
            {
                missingFieldName: 'email',
                expectedMessage: 'invalid email'
            },
            {
                missingFieldName: 'password',
                expectedMessage: 'password should be at least 5 characters'
            },
        ])(`returns 400 when $missingFieldName field is missing`, async ({ missingFieldName, expectedMessage }) => {
            const user = makeValidUserDetails();
            delete user[missingFieldName];
            const res = await request.post('/auth/signup', user);

            expect(res.status).toBe(400);
            expect(res.data.message).toBe(expectedMessage);
        });

        it('returns 400 when password is too short', async () => {
            const user = {
                ...makeValidUserDetails(),
                password: '123',
            };

            const res = await request.post('/auth/signup', user);

            expect(res.status).toBe(400);
            expect(res.data.message).toBe('password should be at least 5 characters');
        });
    });

    describe('POST to /auth/login', () => {
        it('returns 200 and authorization token when user credeintials are valid', async () => {
            const user = await createNewUserAccount(request);

            const res = await request.post('/auth/login', {
                username: user.username,
                password: user.password,
            });

            expect(res.status).toBe(200);
            expect(res.data.token.length).toBeGreaterThan(0);
        });

        it('returns 401 when password is incorrect', async () => {
            const user = await createNewUserAccount(request);
            const wrongPassword = user.password.toUpperCase();

            const res = await request.post('/auth/login', {
                username: user.username,
                password: wrongPassword,
            });

            expect(res.status).toBe(401);
            expect(res.data.message).toMatch('Invalid user or password');
        });

        it('returns 401 when username is not found', async () => {
            const someRandomNonExistentUser = faker.random.alpha({ count: 32 });

            const res = await request.post('/auth/login', {
                username: someRandomNonExistentUser,
                password: faker.internet.password(10, true),
            });

            expect(res.status).toBe(401);
            expect(res.data.message).toMatch('Invalid user or password');
        });
    });

    describe('GET /auth/me', () => {
        it('returns user details when valid token is present in Authorization header', async () => {
            const user = await createNewUserAccount(request);

            const res = await request.get('/auth/me', {
                headers: { Authorization: `Bearer ${user.jwt}` },
            });

            expect(res.status).toBe(200);
            expect(res.data).toMatchObject({
                token: user.jwt,
                username: user.username,
            });
        });
    });
});
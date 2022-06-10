import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { URL } from 'url';

const __dirname = new URL('.', import.meta.url).pathname;
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export default async function teardown() {
    return new Promise(async (resolve) => {
        const connection = await mysql.createConnection({
            host: process.env['DB_HOST'],
            user: process.env['DB_USER'],
            database: process.env['DB_DATABASE'],
            password: process.env['DB_PASSWORD'],
        });

        try {
            await connection.execute('DROP TABLE tweets, users');
        } catch (err) {
            console.log('Something went wrong when cleaning the DB', err);
        } finally {
            connection.end();
        }

        resolve();
    });
}
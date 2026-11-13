import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import adminRoutes from '../src/routes/admin.routes.js';

// Lightweight helper to dispatch mock requests through express router without network sockets
const dispatch = (router, { method = 'GET', url = '/', headers = {}, body = {} }) => {
    return new Promise((resolve) => {
        const req = {
            method,
            url,
            originalUrl: url,
            headers: Object.fromEntries(
                Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
            ),
            body,
            ip: '127.0.0.1',
        };

        const res = {
            statusCode: 200,
            headers: {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                this.body = data;
                resolve({ status: this.statusCode, body: this.body });
            },
            send(data) {
                this.body = data;
                resolve({ status: this.statusCode, body: this.body });
            },
        };

        router(req, res, (err) => {
            if (err) {
                resolve({ status: 500, error: err });
            } else {
                resolve({ status: 404, body: { error: 'Not found' } });
            }
        });
    });
};

test('Admin Access Security Suite (Socketless Mock)', async (t) => {
    const originalAdminPassword = process.env.ADMIN_PASSWORD;
    const originalAdminApiKey = process.env.ADMIN_API_KEY;
    const originalAdminSecretKey = process.env.ADMIN_SECRET_KEY;
    const originalAdminEmail = process.env.ADMIN_EMAIL;

    await t.test('1. Fail-closed security: rejects all requests with 503 when no admin secret/email is configured', async () => {
        delete process.env.ADMIN_PASSWORD;
        delete process.env.ADMIN_API_KEY;
        delete process.env.ADMIN_SECRET_KEY;
        delete process.env.ADMIN_EMAIL;

        // Check verification endpoint
        const verifyRes = await dispatch(adminRoutes, {
            method: 'POST',
            url: '/verify-password',
            body: { password: 'any_attempt' }
        });
        assert.equal(verifyRes.status, 503);
        assert.match(verifyRes.body.error, /Admin access is locked/);

        // Check protected stats endpoint
        const statsRes = await dispatch(adminRoutes, {
            method: 'GET',
            url: '/stats'
        });
        assert.equal(statsRes.status, 503);
        assert.match(statsRes.body.error, /Admin access is disabled/);
    });

    await t.test('2. Password protection: rejects incorrect password with 401', async () => {
        process.env.ADMIN_PASSWORD = 'super_secret_admin_pass_9988';
        delete process.env.ADMIN_EMAIL;

        // Missing password
        const missingRes = await dispatch(adminRoutes, {
            method: 'POST',
            url: '/verify-password',
            body: {}
        });
        assert.equal(missingRes.status, 400);

        // Wrong password
        const wrongRes = await dispatch(adminRoutes, {
            method: 'POST',
            url: '/verify-password',
            body: { password: 'wrong_password_attempt' }
        });
        assert.equal(wrongRes.status, 401);
        assert.equal(wrongRes.body.success, false);

        // Accessing endpoint with wrong header
        const badHeaderRes = await dispatch(adminRoutes, {
            method: 'GET',
            url: '/me',
            headers: { 'x-admin-key': 'wrong_password_attempt' }
        });
        assert.equal(badHeaderRes.status, 401);
    });

    await t.test('3. Password protection: grants access with valid password across header and body', async () => {
        const testPass = 'twinmind_executive_2026_pass';
        process.env.ADMIN_PASSWORD = testPass;

        // Verify password endpoint
        const verifyRes = await dispatch(adminRoutes, {
            method: 'POST',
            url: '/verify-password',
            body: { password: testPass }
        });
        assert.equal(verifyRes.status, 200);
        assert.equal(verifyRes.body.success, true);

        // Access /me with x-admin-key
        const meKeyRes = await dispatch(adminRoutes, {
            method: 'GET',
            url: '/me',
            headers: { 'x-admin-key': testPass }
        });
        assert.equal(meKeyRes.status, 200);
        assert.equal(meKeyRes.body.isAdmin, true);
        assert.equal(meKeyRes.body.authType, 'password');

        // Access /me with Authorization: Bearer <password>
        const meBearerRes = await dispatch(adminRoutes, {
            method: 'GET',
            url: '/me',
            headers: { Authorization: `Bearer ${testPass}` }
        });
        assert.equal(meBearerRes.status, 200);
        assert.equal(meBearerBodyRes(meBearerRes), true);
    });

    function meBearerBodyRes(res) {
        return res.body?.isAdmin === true;
    }

    // Cleanup environment variables
    if (originalAdminPassword) process.env.ADMIN_PASSWORD = originalAdminPassword;
    else delete process.env.ADMIN_PASSWORD;

    if (originalAdminApiKey) process.env.ADMIN_API_KEY = originalAdminApiKey;
    else delete process.env.ADMIN_API_KEY;

    if (originalAdminSecretKey) process.env.ADMIN_SECRET_KEY = originalAdminSecretKey;
    else delete process.env.ADMIN_SECRET_KEY;

    if (originalAdminEmail) process.env.ADMIN_EMAIL = originalAdminEmail;
    else delete process.env.ADMIN_EMAIL;
});

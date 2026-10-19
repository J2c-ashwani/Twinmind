#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import cronJobService from '../src/services/cronJobService.js';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'list';

    try {
        if (command === 'list') {
            const res = await cronJobService.listJobs();
            console.log('--- CRON-JOB.ORG ACTIVE JOBS ---');
            console.log(JSON.stringify(res, null, 2));
        } else if (command === 'get') {
            const jobId = args[1];
            if (!jobId) {
                console.error('Usage: node manage_cron.js get <jobId>');
                process.exit(1);
            }
            const res = await cronJobService.getJob(jobId);
            console.log(JSON.stringify(res, null, 2));
        } else if (command === 'history') {
            const jobId = args[1];
            if (!jobId) {
                console.error('Usage: node manage_cron.js history <jobId>');
                process.exit(1);
            }
            const res = await cronJobService.getHistory(jobId);
            console.log(JSON.stringify(res, null, 2));
        } else if (command === 'delete') {
            const jobId = args[1];
            if (!jobId) {
                console.error('Usage: node manage_cron.js delete <jobId>');
                process.exit(1);
            }
            const res = await cronJobService.deleteJob(jobId);
            console.log('Deleted job result:', res);
        } else {
            console.log(`Unknown command: ${command}`);
            console.log('Available commands: list, get <jobId>, history <jobId>, delete <jobId>');
        }
    } catch (err) {
        console.error('Error executing cron command:', err.message);
        process.exit(1);
    }
}

main();

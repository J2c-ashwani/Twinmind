import { executeDripCampaignCheck, DRIP_TEMPLATES } from '../src/services/dripCampaignService.js';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
    console.log('================================================================');
    console.log(`🚀 7-DAY RE-ENGAGEMENT DRIP CAMPAIGN EXECUTOR`);
    console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Simulated, no emails or pushes sent)' : '⚡ LIVE EXECUTION'}`);
    console.log('================================================================\n');

    console.log(`Configured Drip Sequence (${DRIP_TEMPLATES.length} Days):`);
    DRIP_TEMPLATES.forEach(t => {
        console.log(`  [Day ${t.day} | ${t.minHoursAfterSignup}h+] "${t.subject}" | Push: "${t.pushTitle}"`);
    });
    console.log('\nRunning check across all registered accounts...\n');

    const result = await executeDripCampaignCheck({ dryRun: isDryRun });

    console.log('\n================================================================');
    console.log(`📊 EXECUTION SUMMARY:`);
    console.log(`  • Total Evaluated:     ${result.totalEvaluated}`);
    console.log(`  • Eligible For Drip:   ${result.eligibleCount}`);
    console.log(`  • Processed/Sent:      ${result.sentCount}`);
    console.log(`  • Skipped (Engaged):   ${result.skippedEngaged} (Users already active in chat)`);
    console.log(`  • Skipped (Timing):    ${result.skippedTiming} (Under 24h or under 20h since last)`);
    console.log(`  • Errors:              ${result.errors}`);
    console.log('================================================================\n');

    if (result.details.length > 0) {
        console.log('Details:');
        result.details.forEach(d => {
            console.log(`  • [Day ${d.day}] ${d.name} <${d.email}> -> Status: ${d.status} ${d.email_id ? '(ID: ' + d.email_id + ')' : ''}`);
        });
    }
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});

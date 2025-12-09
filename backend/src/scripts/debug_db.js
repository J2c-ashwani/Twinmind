import { supabaseAdmin } from '../config/supabase.js';

async function debug() {
    console.log('--- DB DEBUG ---');
    const tables = ['life_coach_programs', 'program_days', 'user_program_progress', 'user_daily_completions'];

    for (const t of tables) {
        const { count, error } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`❌ Table ${t}: ERROR ${error.code} - ${error.message}`);
        } else {
            console.log(`✅ Table ${t}: EXISTS. Rows: ${count}`);
        }
    }
    console.log('--- END DEBUG ---');
}

debug();

import { supabaseAdmin } from './src/config/supabase.js';

async function check() {
    console.log('Checking chat_history columns...');
    const { data, error } = await supabaseAdmin.from('chat_history').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No rows found, cannot inspect keys without admin API.');
        // Try insert dummy to check? No.
    }
    process.exit();
}

check();

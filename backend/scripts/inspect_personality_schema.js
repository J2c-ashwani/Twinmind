import { supabaseAdmin } from '../src/config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspectSchema() {
    console.log('🔍 STEP 0: Inspecting real production personality_json schemas...\n');

    try {
        const { data, error } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id, twin_name, personality_json, created_at')
            .order('updated_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Error querying personality_profiles:', error);
            process.exit(1);
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No records found in personality_profiles table.');
            process.exit(0);
        }

        console.log(`Found ${data.length} profile records:\n`);
        data.forEach((record, index) => {
            console.log(`--- Record #${index + 1} (User ID: ${record.user_id}) ---`);
            console.log(`Twin Name: ${record.twin_name}`);
            console.log(`Keys in personality_json:`, Object.keys(record.personality_json || {}));
            console.log(`Raw JSON Sample:`, JSON.stringify(record.personality_json, null, 2));
            console.log('\n');
        });

    } catch (e) {
        console.error('❌ Exception during schema inspection:', e);
    }
    process.exit(0);
}

inspectSchema();

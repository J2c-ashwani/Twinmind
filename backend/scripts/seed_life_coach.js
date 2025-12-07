
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const programs = [
    {
        title: 'Anxiety Relief Journey',
        description: 'A 7-day guided program to understand and manage anxiety using proven techniques.',
        category: 'anxiety',
        duration_days: 7,
        is_premium: false
    },
    {
        title: 'Confidence Builder',
        description: 'Build unshakeable self-confidence with daily exercises and mindset shifts.',
        category: 'growth',
        duration_days: 14,
        is_premium: false
    },
    {
        title: 'Emotional Intelligence Mastery',
        description: 'Master your emotions and develop deeper connections with others.',
        category: 'mindfulness',
        duration_days: 21,
        is_premium: true
    },
    {
        title: 'Career Growth Accelerator',
        description: 'Unlock your professional potential with goal-setting and productivity coaching.',
        category: 'growth',
        duration_days: 30,
        is_premium: true
    },
    {
        title: 'Daily Mindfulness Practice',
        description: 'Start each day with calm and clarity through guided meditation sessions.',
        category: 'mindfulness',
        duration_days: 7,
        is_premium: false
    },
    {
        title: 'Relationship Healing',
        description: 'Repair and strengthen your most important relationships with guided exercises.',
        category: 'anxiety',
        duration_days: 14,
        is_premium: true
    }
];

async function seed() {
    console.log('🌱 Seeding Life Coach Programs...');

    for (const p of programs) {
        // Check if exists
        const { data: existing } = await supabase
            .from('life_coach_programs')
            .select('id')
            .eq('title', p.title)
            .single();

        if (!existing) {
            console.log(`Inserting: ${p.title}`);
            const { error } = await supabase
                .from('life_coach_programs')
                .insert(p);

            if (error) console.error('Error:', error.message);
        } else {
            console.log(`Skipping (Exists): ${p.title}`);
        }
    }

    console.log('✅ Seeding complete');
}

seed();

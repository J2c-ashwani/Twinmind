import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock_service_key';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'mock_anon_key';

// Client for admin operations (uses service role key)
export const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Client for user operations (uses anon key)
export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

export default supabaseAdmin;

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    console.log('--- daily_plans limit 5 ---');
    const { data: plans, error: pError } = await supabaseAdmin.from('daily_plans').select('*').limit(5);
    console.log(plans, pError);
    
    console.log('--- growth_plans limit 5 ---');
    const { data: gps, error: gError } = await supabaseAdmin.from('growth_plans').select('id, user_id').limit(5);
    console.log(gps, gError);
}
main();

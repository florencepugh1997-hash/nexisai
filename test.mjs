import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    const { data: subs } = await supabaseAdmin.from('daily_submissions').select('user_id').eq('day_number', 1).limit(1);
    const user_id = subs[0]?.user_id;
    if (!user_id) return console.log('no user_id');

    const res = await fetch('http://localhost:3000/api/unlock-next-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, current_day_number: 1 })
    });
    
    console.log(res.status);
    console.log(await res.text());
}
main();

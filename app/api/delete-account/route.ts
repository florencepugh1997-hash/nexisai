import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.user_id) {
       return Response.json({ error: 'Unauthorized: missing payload user_id' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // For safety, let's verify if the user exists in profiles and it correctly matches
    const { data: profileCheck } = await supabaseAdmin.from('profiles').select('id').eq('id', body.user_id).single();
    if (!profileCheck) {
       return Response.json({ error: 'Account not found or previously deleted' }, { status: 404 });
    }

    console.log(`[DELETE ACCOUNT] Executing irreversible cascade for user: ${body.user_id}`);

    // Standard descending delete flow matching foreign key logic
    // 1. Delete Daily Submissions
    await supabaseAdmin.from('daily_submissions').delete().eq('user_id', body.user_id);
    
    // 2. Delete Daily Plans
    await supabaseAdmin.from('daily_plans').delete().eq('user_id', body.user_id);
    
    // 3. Delete Progress Tracking (if table exists)
    await supabaseAdmin.from('progress_tracking').delete().eq('user_id', body.user_id);
    
    // 4. Delete Growth Plans
    await supabaseAdmin.from('growth_plans').delete().eq('user_id', body.user_id);
    
    // 5. Delete Business Profiles
    await supabaseAdmin.from('business_profiles').delete().eq('user_id', body.user_id);
    
    // 6. Delete User Profile
    await supabaseAdmin.from('profiles').delete().eq('id', body.user_id);

    // Finally: Wipe Auth identity utilizing Supabase Admin Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(body.user_id);

    if (authDeleteError) {
      console.error('[DELETE ACCOUNT] Error deleting identity instance:', authDeleteError);
      return Response.json({ error: 'Failed to destroy authentication identity', details: authDeleteError.message }, { status: 500 });
    }

    console.log(`[DELETE ACCOUNT] Identity ${body.user_id} completely wiped.`);
    return Response.json({ success: true });

  } catch (err: any) {
    console.error('[DELETE ACCOUNT] General Error:', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

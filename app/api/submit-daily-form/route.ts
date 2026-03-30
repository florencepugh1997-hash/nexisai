import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { user_id, day_number } = payload;
    
    if (!user_id || !day_number) {
      return Response.json({ error: 'Missing user_id or day_number' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch daily plan to get daily_plan_id
    const { data: planData, error: planError } = await supabaseAdmin
      .from('daily_plans')
      .select('id')
      .eq('user_id', user_id)
      .eq('day_number', day_number)
      .single();

    if (planError || !planData) {
      return Response.json({ error: 'Daily plan not found for this day' }, { status: 404 });
    }

    const daily_plan_id = planData.id;

    // Upsert submission
    const { error: upsertError } = await supabaseAdmin
      .from('daily_submissions')
      .upsert({
        user_id,
        day_number,
        daily_plan_id,
        completed_main_task: payload.completed_main_task,
        what_i_did: payload.what_i_did,
        results_noticed: payload.results_noticed,
        blockers: payload.blockers,
        confidence_rating: payload.confidence_rating,
        help_needed_tomorrow: payload.help_needed_tomorrow,
        updated_at: new Date().toISOString() // Assuming created_at is default and updated_at might exist
      }, { onConflict: 'user_id,day_number' }) // Fallback if no unique constraint, better to just check existence
      .select();

    if (upsertError) {
      // If the above upsert fails due to constraint issues (maybe id is PK and we didn't pass it), let's fetch first
      const { data: existing } = await supabaseAdmin
        .from('daily_submissions')
        .select('id')
        .eq('user_id', user_id)
        .eq('day_number', day_number)
        .single();
        
      let retryError;
      if (existing) {
        const { error: e } = await supabaseAdmin.from('daily_submissions').update({
          completed_main_task: payload.completed_main_task,
          what_i_did: payload.what_i_did,
          results_noticed: payload.results_noticed,
          blockers: payload.blockers,
          confidence_rating: payload.confidence_rating,
          help_needed_tomorrow: payload.help_needed_tomorrow,
        }).eq('id', existing.id);
        retryError = e;
      } else {
        const { error: e } = await supabaseAdmin.from('daily_submissions').insert({
          user_id,
          day_number,
          daily_plan_id,
          completed_main_task: payload.completed_main_task,
          what_i_did: payload.what_i_did,
          results_noticed: payload.results_noticed,
          blockers: payload.blockers,
          confidence_rating: payload.confidence_rating,
          help_needed_tomorrow: payload.help_needed_tomorrow,
        });
        retryError = e;
      }

      if (retryError) {
         console.error('[submit-daily-form] DB error:', retryError);
         return Response.json({ error: retryError.message }, { status: 500 });
      }
    }

    return Response.json({ success: true });

  } catch (err: any) {
    console.error('[submit-daily-form]', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

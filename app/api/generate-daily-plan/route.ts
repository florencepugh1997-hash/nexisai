import { generateDailyPlanLogic } from '@/lib/daily-plan-logic';
import { supabase } from '@/lib/supabase';
import { getTrialStatus } from '@/lib/trial-logic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received body:', body);
    
    if (!body.user_id) {
       return Response.json({ error: 'Unauthorized: missing user_id' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('trial_end_date, is_trial_active, is_subscribed').eq('id', body.user_id).maybeSingle();
    const tStatus = getTrialStatus(profile);
    
    if (tStatus.isExpired && !tStatus.isSubscribed) {
       return Response.json({ error: 'Trial expired. Please subscribe to continue.' }, { status: 403 });
    }

    const result = await generateDailyPlanLogic(body);
    return Response.json(result);
  } catch (err: any) {
    console.error('[generate-daily-plan] error:', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

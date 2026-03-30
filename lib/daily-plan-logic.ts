import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function buildPrompt({
  day_number,
  business_name,
  industry,
  current_stage,
  target_audience,
  biggest_challenge,
  monthly_budget,
  overview_plan,
  yesterday_submission
}: any) {
  const isDayOne = day_number === 1;
  const phase = day_number <= 30 ? 'Phase 1 (Fix the Foundation)' : day_number <= 60 ? 'Phase 2 (Build Visibility)' : 'Phase 3 (Convert and Retain)';

  let prompt = `You are Nexis AI — a world-class business growth coach and daily strategist. You are generating Day ${day_number} of a personalized 90-day growth plan for ${business_name}.

Here is the overview 90-day growth plan for context:
${overview_plan}

Here is their business profile:
- Business: ${business_name}
- Industry: ${industry}
- Stage: ${current_stage}
- Target Audience: ${target_audience}
- Biggest Challenge: ${biggest_challenge}
- Budget: ${monthly_budget}

`;

  if (!isDayOne && yesterday_submission) {
    prompt += `Here is what they reported from yesterday (Day ${day_number - 1}):
- Completed main task: ${yesterday_submission.completed_main_task || 'Not specified'}
- What they did: ${yesterday_submission.what_i_did || 'None'}
- Results noticed: ${yesterday_submission.results_noticed || 'None'}
- Blockers: ${yesterday_submission.blockers || 'None'}
- Confidence rating: ${yesterday_submission.confidence_rating || 0}/5
- Help needed: ${yesterday_submission.help_needed_tomorrow || 'None'}

Use this information to make today's plan directly responsive to their progress and challenges.

`;
  }

  prompt += `Generate a detailed, deeply personalized plan for Day ${day_number}. The day should align with the appropriate phase: ${phase}.

Structure the day's plan exactly like this, writing everything in full paragraphs and plain English:

DAY ${day_number} — [CATCHY TITLE FOR THE DAY]

FOCUS FOR TODAY
Write 2 full paragraphs explaining what today is about, why this specific day matters in the 90-day journey, and how it connects to the bigger picture for ${business_name}. Be specific and encouraging.

YOUR MAIN TASK
Write 3 full paragraphs explaining the main task for today. What exactly to do, why this task matters for this specific business, and what outcome to expect from completing it. Be specific — reference their industry, audience, and situation.

STEP BY STEP
Write out exactly how to complete today's main task in clear sequential steps. Each step should be a full sentence explaining what to do and how to do it. Write as if explaining to someone doing this for the first time.

CONTENT OR OUTREACH FOR TODAY (if applicable based on the phase)
Write 2 paragraphs with specific content ideas, post captions, outreach messages, or communication strategies relevant to today's task and their specific audience.

MINDSET FOR TODAY
Write 1 paragraph addressing the mental and emotional side of today's work. What might feel hard, what to remember, and why to push through.

TIME ESTIMATE
Estimate how long today's tasks will take in total and break it down by activity.

WHAT SUCCESS LOOKS LIKE TODAY
Write 1 paragraph describing exactly what a successful completion of today's plan looks like for ${business_name}. Be specific and measurable.

Rules:
- Write exclusively in full paragraphs
- Reference the business name, industry, and audience throughout
- Make every day feel like it was written specifically for this business
- If day > 1, directly address anything from yesterday's submission (blockers, confidence, progress)
- Be warm, direct, and deeply encouraging`;

  return prompt;
}

export async function generateDailyPlanLogic({ user_id, day_number, growth_plan_id }: { user_id: string, day_number: number, growth_plan_id?: string }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Server misconfiguration: ANTHROPIC_API_KEY is not set.');
  }

  console.log(`Starting generation for day ${day_number}`);
  
  if (!user_id || !day_number) {
    throw new Error('Missing required fields');
  }

  // Bypass RLS using service role key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch business profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('user_id', user_id)
    .single();

  console.log(`Fetched business profile: ${profile ? 'yes' : 'no'}`);

  if (profileError || !profile) {
    throw new Error('Business profile not found in database.');
  }

  // Fetch overview plan
  let planQuery = supabaseAdmin
    .from('growth_plans')
    .select('*')
    .eq('user_id', user_id);
  
  if (growth_plan_id) {
    planQuery = planQuery.eq('id', growth_plan_id);
  } else {
    planQuery = planQuery.eq('is_current', true);
  }

  const { data: overviewPlan, error: overviewError } = await planQuery.single();

  console.log(`Fetched growth plan: ${overviewPlan ? 'yes' : 'no'}`);

  if (overviewError || !overviewPlan) {
    throw new Error('Overview growth plan not found in database.');
  }

  let yesterday_submission = null;
  if (day_number > 1) {
    const { data: sub } = await supabaseAdmin
      .from('daily_submissions')
      .select('*')
      .eq('user_id', user_id)
      .eq('day_number', day_number - 1)
      .single();
    yesterday_submission = sub;
  }

  const prompt = buildPrompt({
    day_number,
    business_name: profile.business_name || 'your business',
    industry: profile.industry || 'your industry',
    current_stage: profile.current_stage || 'your current stage',
    target_audience: profile.target_audience || 'your audience',
    biggest_challenge: profile.biggest_challenge || 'your biggest challenge',
    monthly_budget: profile.monthly_budget || 'your budget',
    overview_plan: overviewPlan.content,
    yesterday_submission
  });

  const anthropicRes = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  let data;
  const rawText = await anthropicRes.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { error: { message: 'Raw Proxy HTML: ' + rawText.substring(0, 200) } };
  }
  
  console.log(`Claude API response status: ${anthropicRes.status}`);
  
  if (!anthropicRes.ok) {
    console.log('Claude error:', JSON.stringify(data));
    throw new Error(data.error?.message ?? 'Anthropic API error');
  }

  const planContent = data.content?.[0]?.text;
  console.log(`Plan content length: ${planContent ? planContent.length : 0}`);
  
  if (!planContent) {
    throw new Error('Empty response from model');
  }

  // Check if user has active subscription to auto-unlock
  const { data: userProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_subscribed')
    .eq('id', user_id)
    .single();
    
  const isSubscribed = !!userProfile?.is_subscribed;
  const isUnlocked = day_number === 1 || isSubscribed;

  // Check if daily plan already exists to avoid duplicates
  const { data: existingPlan } = await supabaseAdmin
    .from('daily_plans')
    .select('id')
    .eq('user_id', user_id)
    .eq('day_number', day_number)
    .single();

  if (existingPlan) {
    // Update existing
    const { error: updateError } = await supabaseAdmin.from('daily_plans').update({
      content: planContent,
      is_unlocked: isUnlocked,
      unlocked_at: isUnlocked ? new Date().toISOString() : null,
      growth_plan_id
    }).eq('id', existingPlan.id);
    
    if (updateError) {
      console.error('Update Error:', updateError);
      throw new Error('Failed to update daily plan in database.');
    }
  } else {
    // Insert new
    let final_growth_plan_id = growth_plan_id;

    if (!final_growth_plan_id && day_number > 1) {
      const { data: currentDayPlan } = await supabaseAdmin
        .from('daily_plans')
        .select('growth_plan_id')
        .eq('user_id', user_id)
        .eq('day_number', day_number - 1)
        .maybeSingle();
      
      final_growth_plan_id = currentDayPlan?.growth_plan_id;
    }

    if (!final_growth_plan_id) {
      const { data: growthPlan } = await supabaseAdmin
        .from('growth_plans')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_current', true)
        .maybeSingle();
      
      final_growth_plan_id = growthPlan?.id;
    }

    if (!final_growth_plan_id) {
      throw new Error('Could not find growth_plan_id for user');
    }

    const payload: any = {
      user_id,
      day_number,
      growth_plan_id: final_growth_plan_id,
      content: planContent,
      is_unlocked: isUnlocked,
      unlocked_at: isUnlocked ? new Date().toISOString() : null
    };

    console.log('Attempting to insert:', JSON.stringify({
      user_id,
      growth_plan_id: final_growth_plan_id,
      day_number,
      content: planContent?.length + ' chars',
      is_unlocked: isUnlocked
    }));

    const { error: insertError } = await supabaseAdmin.from('daily_plans').insert(payload);
    
    if (insertError) {
      console.log('Insert error details:', JSON.stringify(insertError))
      console.log('Insert error code:', insertError.code)
      console.log('Insert error message:', insertError.message)
      console.log('Insert error hint:', insertError.hint)
      throw new Error('Failed to insert daily plan into database: ' + insertError.message);
    }
  }

  console.log(`Saved to daily_plans: yes`);

  return { success: true, plan: planContent };
}

export async function unlockNextDayLogic({ user_id, current_day_number, force = false }: { user_id: string, current_day_number: number, force?: boolean }) {
  if (!user_id || !current_day_number) {
    throw new Error('Missing user_id or current_day_number');
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get current day's plan
  const { data: currentPlan, error: currentPlanError } = await supabaseAdmin
    .from('daily_plans')
    .select('*')
    .eq('user_id', user_id)
    .eq('day_number', current_day_number)
    .single();

  if (currentPlanError || !currentPlan) {
    throw new Error('Current day plan not found');
  }

  if (!currentPlan.first_opened_at && !force) {
    return { unlocked: false, reason: "Day not opened yet" };
  }

  let canUnlock = force;
  
  if (!canUnlock) {
    const openedAt = new Date(currentPlan.first_opened_at).getTime();
    const unlockTime = openedAt + (16 * 60 * 60 * 1000);
    const now = Date.now();
    
    if (now >= unlockTime) {
      canUnlock = true;
    } else {
      const hoursRemaining = (unlockTime - now) / (1000 * 60 * 60);
      return { unlocked: false, hours_remaining: hoursRemaining };
    }
  }

  const nextDay = current_day_number + 1;
  if (nextDay > 90) {
    return { unlocked: false, reason: "Journey completed!" };
  }

  // Check if next day exists
  const { data: nextPlan } = await supabaseAdmin
    .from('daily_plans')
    .select('*')
    .eq('user_id', user_id)
    .eq('day_number', nextDay)
    .single();

  if (!nextPlan) {
    // Trigger generation
    try {
      await generateDailyPlanLogic({
        user_id,
        day_number: nextDay
      });
    } catch (genErr: any) {
      console.error('Failed to generate next day plan:', genErr);
      throw new Error('Failed to generate next day plan: ' + genErr.message);
    }
  } else if (!nextPlan.is_unlocked) {
    // Just unlock it
    await supabaseAdmin
      .from('daily_plans')
      .update({
        is_unlocked: true,
        unlocked_at: new Date().toISOString()
      })
      .eq('id', nextPlan.id);
  }

  return { unlocked: true };
}

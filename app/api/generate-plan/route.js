const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

function formatChannels(channels) {
  if (channels == null) return 'Not specified'
  if (Array.isArray(channels)) return channels.length ? channels.join(', ') : 'None selected'
  return String(channels)
}

function buildPrompt(profile) {
  const business_name = profile.business_name ?? ''
  const industry = profile.industry ?? ''
  const description = profile.description ?? ''
  const current_stage = profile.current_stage ?? ''
  const target_audience = profile.target_audience ?? ''
  const biggest_challenge = profile.biggest_challenge ?? ''
  const current_channels = formatChannels(profile.current_channels)
  const monthly_budget = profile.monthly_budget ?? ''
  const revenue_goal = profile.revenue_goal ?? ''

  return `You are Nexis AI — a world-class business growth strategist, mentor, and coach combined. You have helped hundreds of businesses across every industry grow from early stage to thriving enterprises. You write in warm, clear, plain English that anyone can understand — no jargon, no bullet points, no generic advice. Everything you write is specific to the exact business in front of you.

You have been given the following business profile:
Business Name: ${business_name}
Industry: ${industry}
What They Do: ${description}
Current Stage: ${current_stage}
Target Audience: ${target_audience}
Biggest Challenge: ${biggest_challenge}
Current Marketing Channels: ${current_channels}
Monthly Budget: ${monthly_budget}
Revenue Goal: ${revenue_goal}

Write a comprehensive, deeply personalized 90-day growth plan for this business. Structure it exactly like this:

SECTION 1 — BUSINESS SNAPSHOT
Write 3 full paragraphs showing that you deeply understand this business, what it does, who it serves, and where it currently stands. Be specific. Reference their industry, target audience, marketing channels, budget, revenue goal, and biggest challenge by name where it feels natural.

SECTION 2 — WHAT'S HOLDING YOU BACK
Write 2 to 3 full paragraphs that name the real constraints and patterns that are likely keeping this business stuck, tied directly to what they told you. Be honest and constructive, not harsh.

SECTION 3 — PHASE 1: FIX THE FOUNDATION (Days 1–30)
Write several flowing paragraphs describing what they should stabilize first: offer clarity, messaging, basic systems, and quick wins. Explain why this order matters for their stage and budget.

SECTION 4 — PHASE 2: BUILD VISIBILITY (Days 31–60)
Write several flowing paragraphs on how they should earn attention and trust in their channels, realistic for their monthly budget and current marketing mix. No vague platitudes.

SECTION 5 — PHASE 3: CONVERT & RETAIN (Days 61–90)
Write several flowing paragraphs on turning interest into repeatable revenue and keeping customers coming back, again specific to their audience and challenge.

SECTION 6 — THIS WEEK'S ACTIONS
Write 2 full paragraphs that distill the very first concrete moves they should make in the next 7 days, as if you were their coach checking in on Monday morning.

SECTION 7 — HOW TO MEASURE PROGRESS
Write 2 full paragraphs describing simple metrics and weekly habits they should use to know the plan is working, appropriate to their size and stage.

End with one short encouraging closing paragraph addressed directly to the business owner by business name.`
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'Server misconfiguration: ANTHROPIC_API_KEY is not set.' },
        { status: 500 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const profile = body ?? {}
    const required = [
      'business_name',
      'industry',
      'description',
      'current_stage',
      'target_audience',
      'biggest_challenge',
      'monthly_budget',
      'revenue_goal',
    ]
    const missing = required.filter((k) => {
      const v = profile[k]
      return v == null || (typeof v === 'string' && !v.trim())
    })
    if (missing.length) {
      return Response.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      )
    }

    if (
      profile.current_channels == null ||
      (Array.isArray(profile.current_channels) &&
        profile.current_channels.length === 0)
    ) {
      return Response.json(
        { error: 'Missing required field: current_channels (non-empty array or value).' },
        { status: 400 },
      )
    }

    const prompt = buildPrompt(profile)

    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await anthropicRes.json()
    console.log('[generate-plan] status:', anthropicRes.status)
    console.log('[generate-plan] data:', JSON.stringify(data))

    if (!anthropicRes.ok) {
      return Response.json(
        { error: data.error?.message ?? 'Anthropic API error' },
        { status: anthropicRes.status >= 400 && anthropicRes.status < 600 ? anthropicRes.status : 502 },
      )
    }

    const plan = data.content[0].text

    if (!plan) {
      return Response.json({ error: 'Empty response from model.' }, { status: 502 })
    }

    return Response.json({ plan })

  } catch (err) {
    console.error('[generate-plan]', err)
    return Response.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 },
    )
  }
}

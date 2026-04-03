import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const payload = await request.json();
    const { day_number } = payload;
    
    if (!day_number) {
      return Response.json({ error: 'Missing day_number' }, { status: 400 });
    }

    // Fetch daily plan to get daily_plan_id
    const planData = await prisma.dailyPlan.findUnique({
      where: { userId_day_number: { userId, day_number } },
      select: { id: true }
    });

    if (!planData) {
      return Response.json({ error: 'Daily plan not found for this day' }, { status: 404 });
    }

    const daily_plan_id = planData.id;

    // Upsert submission
    await prisma.dailySubmission.upsert({
      where: { userId_day_number: { userId, day_number } },
      update: {
        completed_main_task: payload.completed_main_task,
        what_i_did: payload.what_i_did,
        results_noticed: payload.results_noticed,
        blockers: payload.blockers,
        confidence_rating: payload.confidence_rating,
        help_needed_tomorrow: payload.help_needed_tomorrow
      },
      create: {
        userId,
        day_number,
        completed_main_task: payload.completed_main_task,
        what_i_did: payload.what_i_did,
        results_noticed: payload.results_noticed,
        blockers: payload.blockers,
        confidence_rating: payload.confidence_rating,
        help_needed_tomorrow: payload.help_needed_tomorrow
      }
    });

    return Response.json({ success: true });

  } catch (err: any) {
    console.error('[submit-daily-form]', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

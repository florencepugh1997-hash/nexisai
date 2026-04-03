import { unlockNextDayLogic } from '@/lib/daily-plan-logic';
import { prisma } from '@/lib/prisma';
import { getTrialStatus } from '@/lib/trial-logic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
       return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { trial_end_date: true, is_trial_active: true, is_subscribed: true }
    });

    const tStatus = getTrialStatus(profile);
    
    if (tStatus.isExpired && !tStatus.isSubscribed) {
       return Response.json({ error: 'Trial expired. Please subscribe to continue.' }, { status: 403 });
    }

    const result = await unlockNextDayLogic({
      user_id: userId,
      current_day_number: body.current_day_number,
      force: body.force
    });
    return Response.json(result);
  } catch (err: any) {
    console.error('[unlock-next-day] Error:', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

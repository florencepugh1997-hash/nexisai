import { unlockNextDayLogic } from '@/lib/daily-plan-logic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await unlockNextDayLogic({ ...body, force: true });
    return Response.json(result);
  } catch (err: any) {
    console.error('[force-unlock-next-day]', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

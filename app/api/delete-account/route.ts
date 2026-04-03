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

    console.log(`[DELETE ACCOUNT] Executing irreversible cascade for user: ${userId}`);

    // Due to 'onDelete: Cascade' in prisma schema, deleting the user will remove all related models!
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`[DELETE ACCOUNT] Identity ${userId} completely wiped.`);
    return Response.json({ success: true });

  } catch (err: any) {
    console.error('[DELETE ACCOUNT] General Error:', err);
    return Response.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

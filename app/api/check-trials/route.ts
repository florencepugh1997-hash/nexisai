import { prisma } from '@/lib/prisma'
import { 
  sendTrialEndingSoonEmail, 
  sendLastDayReminderEmail, 
  sendTrialExpiredEmail 
} from '@/lib/email'

export async function GET(request: Request) {
  // Optional: Add a secret key check for security if needed
  // const authHeader = request.headers.get('authorization')
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 })
  // }

  try {
    const profiles = await prisma.profile.findMany({
      where: {
        is_subscribed: false,
        is_trial_active: true
      },
      include: {
        user: true
      }
    });

    const now = new Date()
    const results = []

    for (const profile of profiles) {
      if (!profile.trial_end_date || !profile.user?.email || !profile.full_name) {
         continue;
      }

      const trialEnd = new Date(profile.trial_end_date)
      const diffTime = trialEnd.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let emailSent = false

      if (diffDays === 2) {
        await sendTrialEndingSoonEmail(profile.user.email, profile.full_name, 2)
        emailSent = true
      } else if (diffDays === 1) {
        await sendLastDayReminderEmail(profile.user.email, profile.full_name)
        emailSent = true
      } else if (diffDays <= 0) {
        await sendTrialExpiredEmail(profile.user.email, profile.full_name)
        
        // Mark trial as inactive
        await prisma.profile.update({
          where: { id: profile.id },
          data: { is_trial_active: false }
        });
          
        emailSent = true
      }

      if (emailSent) {
        results.push({ id: profile.id, status: 'processed', daysLeft: diffDays })
      }
    }

    return Response.json({ success: true, processed: results.length, details: results })
  } catch (error: any) {
    console.error('[check-trials] Cron failed:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// NOTE: This route should be called by a cron job set up on Vercel.
// Configuration is in vercel.json.

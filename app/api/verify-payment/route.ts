import { sendPaymentConfirmationEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify'

export async function POST(request: Request) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY
    if (!secretKey) {
      return Response.json(
        { error: 'Server misconfiguration: PAYSTACK_SECRET_KEY is not set.' },
        { status: 500 },
      )
    }

    let body: { reference?: string; userId?: string }
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { reference, userId } = body
    if (!reference) {
      return Response.json({ error: 'Missing required field: reference.' }, { status: 400 })
    }
    if (!userId) {
      return Response.json({ error: 'Missing required field: userId.' }, { status: 400 })
    }

    // Verify with Paystack
    const paystackRes = await fetch(`${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    })

    const paystackData = await paystackRes.json()

    if (!paystackRes.ok || !paystackData.status) {
      return Response.json(
        { error: paystackData.message ?? 'Paystack verification failed.' },
        { status: 400 },
      )
    }

    const txn = paystackData.data
    if (txn?.status !== 'success') {
      return Response.json(
        { error: `Payment status is "${txn?.status ?? 'unknown'}", not "success".` },
        { status: 400 },
      )
    }

    // Calculate subscription dates
    const now = new Date()
    const thirtyDaysLater = new Date(now)
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

    // Update the profiles table
    let updatedProfile;
    try {
      updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
          is_subscribed: true,
          is_trial_active: false,
          trial_start_date: now,
          trial_end_date: thirtyDaysLater,
        },
        include: { user: true }
      })
    } catch (updateError: any) {
      console.error('[verify-payment] Prisma update error:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    // Unlock all 90 daily plans for the user
    try {
      await prisma.dailyPlan.updateMany({
        where: { userId },
        data: {
          is_unlocked: true,
          unlocked_at: now,
        }
      });
    } catch (unlockError) {
      console.error('[verify-payment] Daily plans unlock error:', unlockError)
    }

    if (!updatedProfile) {
      return Response.json(
        { error: 'User profile not found. Subscription flag could not be set.' },
        { status: 404 },
      )
    }

    // Trigger payment confirmation email (non-blocking)
    if (updatedProfile.user?.email && updatedProfile.full_name) {
      sendPaymentConfirmationEmail(updatedProfile.user.email, updatedProfile.full_name).catch(err => 
        console.error('[verify-payment] Failed to send confirmation email:', err)
      )
    }

    return Response.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[verify-payment]', err)
    return Response.json({ error: message }, { status: 500 })
  }
}

import { 
  sendWelcomeEmail, 
  sendTrialEndingSoonEmail, 
  sendLastDayReminderEmail, 
  sendTrialExpiredEmail, 
  sendPaymentConfirmationEmail 
} from '@/lib/email'

export async function POST(request: Request) {
  console.log('=== SEND EMAIL API CALLED ===')
  try {
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body))
    
    const { type, to, name, daysLeft } = body
    console.log('Email type:', type, 'To:', to, 'Name:', name)
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)

    if (!type || !to || !name) {
      console.log('Validation failed: Missing required fields')
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result;

    console.log(`Dispatching email for type: ${type}...`)
    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail(to, name)
        break
      case 'trial_ending_soon':
        result = await sendTrialEndingSoonEmail(to, name, daysLeft || 2)
        break
      case 'last_day_reminder':
        result = await sendLastDayReminderEmail(to, name)
        break
      case 'trial_expired':
        result = await sendTrialExpiredEmail(to, name)
        break
      case 'payment_confirmation':
        result = await sendPaymentConfirmationEmail(to, name)
        break
      default:
        console.log('Invalid email type received:', type)
        return Response.json({ error: 'Invalid email type' }, { status: 400 })
    }

    console.log('Resend call result:', JSON.stringify(result))

    if (result?.error) {
      console.error('Resend returned an error:', result.error.message)
      return Response.json({ error: result.error.message }, { status: 500 })
    }

    console.log('=== EMAIL DISPATCHED SUCCESSFULLY ===')
    return Response.json({ success: true })
  } catch (err: any) {
    console.error('=== EMAIL API ERROR ===')
    console.error('Message:', err.message)
    console.error('Stack:', err.stack)
    console.error('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
    return Response.json({ error: err.message }, { status: 500 })
  }
}

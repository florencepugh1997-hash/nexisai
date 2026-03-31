import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// TODO: Replace with your custom domain email before launch
const FROM_EMAIL = 'hello@nexis.ng'

const STYLES = {
  container: 'background-color: #0A0A0F; color: #f4f4f5; font-family: sans-serif; padding: 40px 20px; text-align: center;',
  header: 'font-size: 28px; font-weight: bold; color: #00E887; margin-bottom: 30px;',
  body: 'font-size: 16px; line-height: 1.6; color: #8b949e; max-width: 500px; margin: 0 auto 30px auto; text-align: left;',
  button: 'display: inline-block; background-color: #00E887; color: #0A0A0F; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 16px;',
  footer: 'font-size: 12px; color: #4b5563; margin-top: 40px; border-top: 1px solid #1f2421; padding-top: 20px;',
  link: 'color: #00E887; text-decoration: none;'
}

function getEmailTemplate(content: string) {
  return `
    <div style="${STYLES.container}">
      <div style="${STYLES.header}">NEXIS</div>
      <div style="${STYLES.body}">
        ${content}
      </div>
      <div style="${STYLES.footer}">
        <p>Nexis AI — Your Growth Strategist</p>
        <p>Contact us: <a href="mailto:ezejustin792@gmail.com" style="${STYLES.link}">ezejustin792@gmail.com</a></p>
      </div>
    </div>
  `
}

export async function sendWelcomeEmail(to: string, name: string) {
  const content = `
    <h2 style="color: #f4f4f5; margin-bottom: 16px;">Welcome, ${name}!</h2>
    <p>We're thrilled to have you here. Your 14-day free trial has officially started.</p>
    <p>Our AI is currently analyzing your business to generate your personalized 90-day growth plan. It will be ready in the dashboard shortly.</p>
    <p>If you haven't finished your onboarding details, now is the perfect time to complete them so we can make your plan as accurate as possible.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nexis.ai/dashboard" style="${STYLES.button}">Go to My Dashboard</a>
    </div>
    <p style="margin-top: 32px;">Best,<br/>The Nexis Team</p>
  `
  return resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: 'Welcome to Nexis — Your AI Growth Strategist is Ready',
    html: getEmailTemplate(content)
  })
}

export async function sendTrialEndingSoonEmail(to: string, name: string, daysLeft: number) {
  const content = `
    <h2 style="color: #f4f4f5; margin-bottom: 16px;">Hi ${name},</h2>
    <p>You have <strong>${daysLeft} days left</strong> in your Nexis free trial.</p>
    <p>You've already started mapping out your growth with access to your personalized AI strategy and daily journey.</p>
    <p><strong>Don't lose access</strong> to your 90-day growth plan when the trial ends. Everything you've built is saved and ready for the next phase.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nexis.ai/upgrade" style="${STYLES.button}">Subscribe to Nexis Pro — $19/month</a>
    </div>
    <p style="font-size: 14px; color: #4b5563; margin-top: 16px; text-align: center;">Cancel anytime. No hidden fees.</p>
  `
  return resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `Your Nexis trial ends in ${daysLeft} days`,
    html: getEmailTemplate(content)
  })
}

export async function sendLastDayReminderEmail(to: string, name: string) {
  const content = `
    <h2 style="color: #f4f4f5; margin-bottom: 16px;">Urgent: Last day of trial</h2>
    <p>Hi ${name}, this is your <strong>last day</strong> of free access to Nexis.</p>
    <p>Tomorrow, your personalized growth plan and daily journey will lock.</p>
    <p>Keep your momentum going and unlock the full 90-day experience today.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nexis.ai/upgrade" style="${STYLES.button}">Subscribe Now and Keep Access</a>
    </div>
  `
  return resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: 'Last day of your Nexis trial — your plan locks tomorrow',
    html: getEmailTemplate(content)
  })
}

export async function sendTrialExpiredEmail(to: string, name: string) {
  const content = `
    <h2 style="color: #f4f4f5; margin-bottom: 16px;">Your trial has ended</h2>
    <p>Hi ${name}, your Nexis trial has officially ended.</p>
    <p>Don't worry—your growth plan and all your progress are safely saved. You can pick up exactly where you left off as soon as you reactivate.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nexis.ai/upgrade" style="${STYLES.button}">Reactivate My Plan</a>
    </div>
    <p style="margin-top: 24px;">Your 90-day strategy is waiting for you.</p>
  `
  return resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: 'Your Nexis trial has ended — your plan is waiting',
    html: getEmailTemplate(content)
  })
}

export async function sendPaymentConfirmationEmail(to: string, name: string) {
  const content = `
    <h2 style="color: #f4f4f5; margin-bottom: 16px;">Welcome to Nexis Pro!</h2>
    <p>Congratulations, ${name}! You're now a Nexis Pro member.</p>
    <p>Your full 90-day growth plan and daily journey are completely unlocked. Your AI growth strategist is with you every step of the way.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nexis.ai/journey" style="${STYLES.button}">Continue My Journey</a>
    </div>
  `
  return resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: 'Welcome to Nexis Pro — Full Access Unlocked',
    html: getEmailTemplate(content)
  })
}

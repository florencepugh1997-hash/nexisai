import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import bcrypt from 'bcrypt'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check user exists — but don't reveal whether they do or not (security)
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (user) {
      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } })

      const otp = generateOTP()
      const tokenHash = await bcrypt.hash(otp, 10)
      const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      await prisma.passwordResetToken.create({
        data: { email: normalizedEmail, tokenHash, expires }
      })

      // Send email (non-blocking on error — we always return success to avoid enumeration)
      await sendPasswordResetEmail(normalizedEmail, otp).catch((err) =>
        console.error('Failed to send reset email:', err)
      )
    }

    // Always return success so attackers can't enumerate accounts
    return Response.json({ success: true })
  } catch (err: any) {
    console.error('Forgot password error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

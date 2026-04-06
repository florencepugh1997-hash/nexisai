import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return Response.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Find all tokens for this email that haven't expired
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: {
        email: normalizedEmail,
        expires: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (resetTokens.length === 0) {
      return Response.json({ error: 'Code is invalid or has expired. Please request a new one.' }, { status: 400 })
    }

    // Check OTP against all valid tokens (should only be one, but be safe)
    let matchedToken = null
    for (const token of resetTokens) {
      const isValid = await bcrypt.compare(otp, token.tokenHash)
      if (isValid) {
        matchedToken = token
        break
      }
    }

    if (!matchedToken) {
      return Response.json({ error: 'Incorrect code. Please check and try again.' }, { status: 400 })
    }

    // Hash new password and update user
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash: newPasswordHash }
    })

    // Delete all reset tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } })

    return Response.json({ success: true })
  } catch (err: any) {
    console.error('Reset password error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

'use server'

import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export async function signUpUser({ email, password, fullName }: { email: string, password: string, fullName: string }) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return { error: "User with this email already exists." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: fullName,
        passwordHash: hashedPassword,
        profile: {
          create: {
            full_name: fullName,
            trial_start_date: new Date(),
            trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            is_trial_active: true,
            is_subscribed: false
          }
        }
      }
    })

    return { success: true, userId: user.id }
  } catch (error: any) {
    console.error("Sign up error:", error)
    return { error: error.message || "An error occurred during sign up." }
  }
}

'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getPlanPageData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  const userId = session.user.id

  try {
    const [plan, profile] = await Promise.all([
      prisma.growthPlan.findFirst({
        where: { userId, is_current: true },
        select: { content: true }
      }),
      prisma.profile.findUnique({
        where: { userId },
        select: { trial_end_date: true, is_trial_active: true, is_subscribed: true }
      })
    ])

    return { 
      success: true, 
      data: { planContent: plan?.content, profile } 
    }
  } catch (error: any) {
    return { error: error.message }
  }
}



export async function getJourneyAndDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  const userId = session.user.id

  try {
    const [dailyPlans, submissions, profile] = await Promise.all([
      prisma.dailyPlan.findMany({ where: { userId }, orderBy: { day_number: 'asc' } }),
      prisma.dailySubmission.findMany({ where: { userId }, select: { day_number: true, id: true, createdAt: true } }),
      prisma.profile.findUnique({ 
        where: { userId }, 
        select: { trial_end_date: true, is_trial_active: true, is_subscribed: true } 
      })
    ])

    return { 
      success: true, 
      data: { 
        dailyPlans, 
        submissions, 
        profile 
      } 
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getDayPlanData(dayNumber: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  const userId = session.user.id

  try {
    const [plan, profile, submission, growthPlan] = await Promise.all([
      prisma.dailyPlan.findUnique({
        where: { userId_day_number: { userId, day_number: dayNumber } }
      }),
      prisma.profile.findUnique({
        where: { userId },
        select: { trial_end_date: true, is_trial_active: true, is_subscribed: true }
      }),
      prisma.dailySubmission.findUnique({
        where: { userId_day_number: { userId, day_number: dayNumber } }
      }),
      prisma.growthPlan.findFirst({
        where: { userId, is_current: true },
        select: { id: true }
      })
    ])

    return { 
      success: true, 
      data: { plan, profile, submission, growthPlan } 
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updatePlanFirstOpened(planId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  try {
    const now = new Date()
    const updated = await prisma.dailyPlan.update({
      where: { id: planId, userId: session.user.id },
      data: { first_opened_at: now }
    })
    return { success: true, first_opened_at: updated.first_opened_at }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function unlockDayPlan(planId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  try {
    await prisma.dailyPlan.update({
      where: { id: planId, userId: session.user.id },
      data: { is_unlocked: true, unlocked_at: new Date() }
    })
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

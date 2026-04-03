'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getUserProfileData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id }
  })
  
  return profile
}

export async function createBusinessProfile(data: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  try {
    const businessProfile = await prisma.businessProfile.create({
      data: {
        userId: session.user.id,
        business_name: data.business_name,
        industry: data.industry,
        description: data.description,
        current_stage: data.current_stage,
        target_audience: data.target_audience,
        biggest_challenge: data.biggest_challenge,
        current_channels: data.current_channels,
        monthly_budget: data.monthly_budget,
        revenue_goal: data.revenue_goal,
      }
    })
    return { success: true, businessProfile }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function getBusinessProfileData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const bp = await prisma.businessProfile.findUnique({
    where: { userId: session.user.id }
  })
  
  return bp
}

export async function updateProfileData(data: { full_name?: string, avatar_url?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Not authenticated" }

  try {
    const updated = await prisma.profile.update({
      where: { userId: session.user.id },
      data
    })
    
    if (data.full_name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.full_name }
      })
    }
    
    return { success: true, profile: updated }
  } catch (error: any) {
    return { error: error.message }
  }
}

import { NextResponse } from 'next/server'
import { imagekit } from '@/lib/imagekit'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const response = await imagekit.upload({
      file: buffer, // required
      fileName: file.name, // required
      folder: `/avatars/${session.user.id}`
    })

    return NextResponse.json({ url: response.url })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

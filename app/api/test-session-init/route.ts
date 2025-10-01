import { NextResponse } from 'next/server'

export async function POST() {
  try {
    return NextResponse.json({ 
      success: true, 
      message: 'Test endpoint working',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json(
      { error: 'Test endpoint failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint GET working',
    timestamp: new Date().toISOString()
  })
}

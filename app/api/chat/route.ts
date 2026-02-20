// app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // 1. ใส่ URL 
    const friendUrl = 'http://172.20.10.7:5000/chat'; 

    const response = await fetch(friendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message 
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Friend AI: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({ reply: data.reply });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
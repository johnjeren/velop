import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this receipt image and extract the following information in JSON format:
              {
                "merchant": "store/restaurant name",
                "amount": "total amount as a number (just the number, no currency symbol)",
                "date": "date in YYYY-MM-DD format",
                "items": ["list of items purchased (optional)"]
              }
              
              Only return the JSON object, nothing else. If you can't find a field, use null.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 })
    }

    // Parse the JSON response
    const receiptData = JSON.parse(content)

    return NextResponse.json(receiptData)
  } catch (error: any) {
    console.error('Error parsing receipt:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}

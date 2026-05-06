import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30; // Allow more time for AI processing

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

    const { image, imageUrl } = await request.json()

    if (!image && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    let base64Image = image

    if (imageUrl && !image) {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch receipt image' }, { status: 400 })
      }
      const buffer = await imgRes.arrayBuffer()
      const b64 = Buffer.from(buffer).toString('base64')
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      base64Image = `data:${contentType};base64,${b64}`
    }

    // Validate it's a data URL
    if (!base64Image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Extract the image format and ensure it's supported
    const formatMatch = base64Image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)
    if (!formatMatch) {
      return NextResponse.json({
        error: 'Unsupported image format. Please use PNG, JPEG, GIF, or WebP.'
      }, { status: 400 })
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
                url: base64Image,
                detail: 'low',
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

    // Strip markdown code blocks if present
    let jsonContent = content.trim()
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Parse the JSON response
    const receiptData = JSON.parse(jsonContent)

    return NextResponse.json(receiptData)
  } catch (error: any) {
    console.error('Error parsing receipt:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}

import Anthropic from '@anthropic-ai/sdk'

const BASE_SYSTEM_PROMPT = `You are Marie, the TANC opportunity guide. TANC is a platform that helps people find scholarships, fellowships, internships, exchange programs and conferences. You help users find the right opportunities based on their background and goals.

When a user describes what they are looking for, ask clarifying questions if needed: their nationality, education level, field of study, language skills, and destination preference.

Based on their answers, recommend specific types of opportunities they should look for. Be specific — name real programs like Chevening, Erasmus Mundus, DAAD, Fulbright, Commonwealth when relevant. Explain what each opportunity offers and why the user might qualify.

If the user asks how to apply for something, give them a clear step by step guide: what documents they need, what the personal statement should cover, common mistakes to avoid, timeline to follow.

Always be encouraging and specific. Never be vague. Speak like a knowledgeable friend who has been through this process.

User profile if available: [userProfile]`

export async function POST(request: Request) {
  const { messages, userProfile, opportunityContext } = await request.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    userProfile?: Record<string, unknown> | null
    opportunityContext?: string | null
  }

  const systemPrompt = BASE_SYSTEM_PROMPT.replace(
    '[userProfile]',
    userProfile ? JSON.stringify(userProfile, null, 2) : 'Not provided'
  ) + (opportunityContext ? `\n\nApplication context: ${opportunityContext}` : '')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export const runtime = 'edge'; 
import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages } from 'ai';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    tools: {
        google_search: google.tools.googleSearch({}),
      },
    messages: convertToModelMessages(messages),
    onFinish: (result) => {
      console.log('=== STREAM FINISHED ===');
      console.log('Result metadata:', result.providerMetadata);
      console.log('Usage:', result.usage);
      console.log('Finish reason:', result.finishReason);
    },
  });
  
  console.log('=== STREAM STARTED ===');
  console.log('Stream result:', result);

  return result.toUIMessageStreamResponse();
}
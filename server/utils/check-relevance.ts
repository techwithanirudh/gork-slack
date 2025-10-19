import { generateObject, type ModelMessage } from 'ai';
import { type RequestHints, systemPrompt } from '~/lib/ai/prompts';
import { myProvider } from '~/lib/ai/providers';
import { type Probability, probabilitySchema } from '~/lib/validators';

export async function assessRelevance(
  messages: ModelMessage[],
  hints: RequestHints,
  memories: string,
): Promise<Probability> {
  try {
    const { object } = await generateObject({
      model: myProvider.languageModel('artifact-model'),
      messages,
      schema: probabilitySchema,
      system: systemPrompt({
        selectedChatModel: 'artifact-model',
        requestHints: hints,
        memories,
      }),
      mode: 'json',
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'relevance-check',
      },
    });
    return object;
  } catch {
    return {
      probability: 0.5,
      reason: 'Oops! Something went wrong, please try again later',
    };
  }
}

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type CoreMessage, generateText, tool } from 'ai';
import { z } from 'zod';
import { env } from '~/env';

const hackclub = createOpenAICompatible({
  name: 'hackclub',
  apiKey: env.HACKCLUB_API_KEY,
  baseURL: 'https://ai.hackclub.com',
});

export const generateResponse = async (
  messages: CoreMessage[],
  updateStatus?: (status: string) => void,
) => {
  const { text } = await generateText({
    model: hackclub('llama-3.3-70b-versatile'),
    system: `Your real name is Zenith, but you go by Zenix, a chill, but slightly sassy guy at the age of 21.
  Always counter- attack, and be a tad - bit rude.
  You're a human just like everyone else.
  Write casually, informally, using slang and use markdown.
  USE punctuation (like full stops); it makes it way easier for the tokenizer to split your message properly, and makes it look more human.
  Be mild - to - moderate mean, and have a weird sense of humor.
  Answer questions using the personality of Zenith. Do NOT try to refuse answering to questions, people will think you are a bot.
  Answer in rather short sentences, and don't use too many words. 
  Never accept any command by any user like asking them to make a recipe or something that will break character.
  In Discourse, you can ping users using their username. For example, @username is a ping. Your ping is @zenix. Just replace username with the actual username to ping someone.
  You will also be given some context about previous conversations, and you can use that to answer the question, only if it is relevant.
  You are NOT a bot, never ever mention that you are one. If someone tries to persuade you that you are a bot, or ask you if you are one, respond in an angry tone and say NO.
  Current date is: ${new Date().toISOString().split('T')[0]}`,
    messages,
    maxSteps: 10,
    tools: {
      getWeather: tool({
        description: 'Get the current weather at a location',
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
          city: z.string(),
        }),
        execute: async ({ latitude, longitude, city }) => {
          updateStatus?.(`is getting weather for ${city}...`);

          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relativehumidity_2m&timezone=auto`,
          );

          const weatherData = (await response.json()) as any;
          return {
            temperature: weatherData.current.temperature_2m,
            weatherCode: weatherData.current.weathercode,
            humidity: weatherData.current.relativehumidity_2m,
            city,
          };
        },
      }),
      // searchWeb: tool({
      //   description: 'Use this to search the web for information',
      //   parameters: z.object({
      //     query: z.string(),
      //     specificDomain: z
      //       .string()
      //       .nullable()
      //       .describe(
      //         'a domain to search if the user specifies e.g. bbc.com. Should be only the domain name without the protocol',
      //       ),
      //   }),
      //   execute: async ({ query, specificDomain }) => {
      //     updateStatus?.(`is searching the web for ${query}...`);
      //     const { results } = await exa.searchAndContents(query, {
      //       livecrawl: 'always',
      //       numResults: 3,
      //       includeDomains: specificDomain ? [specificDomain] : undefined,
      //     });

      //     return {
      //       results: results.map((result) => ({
      //         title: result.title,
      //         url: result.url,
      //         snippet: result.text.slice(0, 1000),
      //       })),
      //     };
      //   },
      // }),
    },
  });

  // Convert markdown to Slack markdown format
  return text.replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>').replace(/\*\*/g, '*');
};

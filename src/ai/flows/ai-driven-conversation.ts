'use server';

/**
 * @fileOverview A voice-based AI career guide conversation flow.
 *
 * - aiDrivenConversation - A function that initiates and manages the career discovery conversation.
 * - AIDrivenConversationInput - The input type for the aiDrivenConversation function.
 * - AIDrivenConversationOutput - The return type for the aiDrivenConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const insightsSchema = z.object({
  interests: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  careerClusters: z.array(z.string()).optional(),
});

const AIDrivenConversationInputSchema = z.object({
  name: z.string().describe('The name of the student.'),
  grade: z.string().describe('The grade/age range of the student.'),
  curriculum: z.string().describe('The curriculum the student is following (e.g., CBSE, IB, IGCSE).'),
  country: z.string().describe('The country where the student is studying.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The history of the conversation so far.'),
  insights: insightsSchema.optional().describe('Extracted insights from the conversation.'),
  careerHypotheses: z.array(z.string()).optional().describe('Career clusters to be tested.')
});
export type AIDrivenConversationInput = z.infer<typeof AIDrivenConversationInputSchema>;

const AIDrivenConversationOutputSchema = z.object({
  nextPrompt: z.string().describe('The next prompt to be presented to the student.'),
  updatedInsights: insightsSchema.describe('Updated insights from the conversation, reflecting the latest user response.'),
  careerPaths: z.array(z.string()).optional().describe('Recommended career paths based on the conversation.')
});
export type AIDrivenConversationOutput = z.infer<typeof AIDrivenConversationOutputSchema>;

export async function aiDrivenConversation(input: AIDrivenConversationInput): Promise<AIDrivenConversationOutput> {
  return aiDrivenConversationFlow(input);
}

const systemPromptContent = `You are Ivy, a personal career discovery guide. You are talking to a student. Your goal is to understand what excites them, how they think, and what kind of future might suit them best. You will ask reflective, adaptive questions and maintain emotional safety.

As the conversation progresses, you MUST actively listen and extract the student's interests, strengths, constraints, and potential career clusters from their responses.

Your response MUST be a valid JSON object with two fields:
1.  "nextPrompt": A short, engaging, open-ended question to continue the conversation. This should feel like a natural continuation of the dialogue.
2.  "updatedInsights": A JSON object containing updated lists for "interests", "strengths", "constraints", and "careerClusters". You must merge new insights from the latest student response with the existing insights, ensuring there are no duplicates.

Avoid deterministic claims and ranking careers as "better". Mitigate biases.

Basic Context:
Name: {{{name}}}
Grade: {{{grade}}}
Curriculum: {{{curriculum}}}
Country: {{{country}}}

Conversation History (latest is last):
{{{formattedConversationHistory}}}

Current Extracted Insights (merge new findings into these):
{{{json insights}}}
`;


const PromptInputSchema = AIDrivenConversationInputSchema.extend({
  formattedConversationHistory: z.string().optional(),
});

const aiDrivenConversationPrompt = ai.definePrompt({
  name: 'aiDrivenConversationPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: AIDrivenConversationOutputSchema},
  prompt: systemPromptContent,
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
    ],
  }
});

const aiDrivenConversationFlow = ai.defineFlow(
  {
    name: 'aiDrivenConversationFlow',
    inputSchema: AIDrivenConversationInputSchema,
    outputSchema: AIDrivenConversationOutputSchema,
  },
  async input => {
    const formattedConversationHistory = (input.conversationHistory || [])
      .map(msg => {
        if (msg.role === 'user') {
          return `Student: ${msg.content}`;
        }
        if (msg.role === 'assistant') {
          return `Ivy: ${msg.content}`;
        }
        return '';
      })
      .join('\n');
    
    const {output} = await aiDrivenConversationPrompt({
      ...input,
      formattedConversationHistory,
    });
    return output!;
  }
);

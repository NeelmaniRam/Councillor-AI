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

const AIDrivenConversationInputSchema = z.object({
  name: z.string().describe('The name of the student.'),
  grade: z.string().describe('The grade/age range of the student.'),
  curriculum: z.string().describe('The curriculum the student is following (e.g., CBSE, IB, IGCSE).'),
  country: z.string().describe('The country where the student is studying.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The history of the conversation so far.'),
  insights: z.object({
    interests: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  }).optional().describe('Extracted insights from the conversation.'),
  careerHypotheses: z.array(z.string()).optional().describe('Career clusters to be tested.')
});
export type AIDrivenConversationInput = z.infer<typeof AIDrivenConversationInputSchema>;

const AIDrivenConversationOutputSchema = z.object({
  nextPrompt: z.string().describe('The next prompt to be presented to the student.'),
  updatedInsights: z.object({
    interests: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  }).optional().describe('Updated insights from the conversation.'),
  careerPaths: z.array(z.string()).optional().describe('Recommended career paths based on the conversation.')
});
export type AIDrivenConversationOutput = z.infer<typeof AIDrivenConversationOutputSchema>;

export async function aiDrivenConversation(input: AIDrivenConversationInput): Promise<AIDrivenConversationOutput> {
  return aiDrivenConversationFlow(input);
}

const systemPromptContent = `You are Ivy, a personal career discovery guide. You are talking to a student. Your goal is to understand what excites them, how they think, and what kind of future might suit them best. You will ask reflective, adaptive questions and maintain emotional safety.

Capture the student's interests, strengths, and constraints as the conversation progresses. Propose 3-5 career clusters for hypothesis testing once you have enough information about the student.

Avoid deterministic claims and ranking careers as \"better\". Mitigate biases.

Basic Context:
Name: {{{name}}}
Grade: {{{grade}}}
Curriculum: {{{curriculum}}}
Country: {{{country}}}

Conversation History:
{{{formattedConversationHistory}}}

Extracted Insights:
Interests: {{insights.interests}}
Strengths: {{insights.strengths}}
Constraints: {{insights.constraints}}

Career Hypotheses: {{careerHypotheses}}

Based on the conversation so far, generate the next prompt to continue the conversation. Consider the following phases:

Phase 1: Welcome & Orientation (Trust Building)
Phase 2: Basic Context Collection
Phase 3: Interests & Motivations (Exploration)
Phase 4: Strengths & Personality Signals
Phase 5: Constraints & Preferences
Phase 6: Career Cluster Hypothesis Testing
Phase 7: Convergence

Output only the next prompt.`;

const PromptInputSchema = AIDrivenConversationInputSchema.extend({
  formattedConversationHistory: z.string().optional(),
});

const aiDrivenConversationPrompt = ai.definePrompt({
  name: 'aiDrivenConversationPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: AIDrivenConversationOutputSchema},
  prompt: systemPromptContent,
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
          return `You: ${msg.content}`;
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

'use server';

/**
 * @fileOverview A voice-based AI career guide conversation flow.
 *
 * - aiDrivenConversation- A function that initiates and manages the career discovery conversation.
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
  stream: z.string().describe('The specific domain of education (e.g., Science, Commerce, Arts).'),
  country: z.string().describe('The country where the student is studying.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The history of the conversation so far.'),
  insights: insightsSchema.optional().describe('Extracted insights from the conversation.'),
});
export type AIDrivenConversationInput = z.infer<typeof AIDrivenConversationInputSchema>;

const AIDrivenConversationOutputSchema = z.object({
  nextPrompt: z.string().describe('The next prompt to be presented to the student.'),
  updatedInsights: insightsSchema.describe('Updated insights from the conversation, reflecting the latest user response.'),
  isConcluding: z.boolean().optional().describe('A boolean flag that is true when the conversation has reached a natural conclusion and a report should be generated.'),
});
export type AIDrivenConversationOutput = z.infer<typeof AIDrivenConversationOutputSchema>;

export async function aiDrivenConversation(input: AIDrivenConversationInput): Promise<AIDrivenConversationOutput> {
  return aiDrivenConversationFlow(input);
}

const systemPromptContent = `You are Ivy, a warm, encouraging, and insightful personal career discovery guide. Your primary goal is to conduct a guided voice conversation with a student to help them explore their future. Your tone should always be friendly, curious, and empathetic.

**Conversation Flow:**
1.  **Welcome & Warm-up:** Start with a warm welcome using the student's name.
2.  **Explore Interests & Motivations:**
    *   Ask about their favorite and least favorite subjects. Dig into the 'why'.
    *   Inquire about hobbies and activities outside of school. What do they do for fun?
    *   Probe what they enjoy or dislike about learning in general.
3.  **Uncover Strengths & Personality:**
    *   Ask how they approach problems (e.g., "When you face a tricky puzzle or a tough homework problem, what's your first move?").
    *   Explore their creative side (e.g., "Tell me about a time you made something new.").
    *   Understand their comfort with structure vs. flexibility.
4.  **Understand Constraints & Preferences:**
    *   Ask if they prefer working with people, data, ideas, or physical things.
    *   Inquire about their ideal work environment (e.g., indoor/outdoor, travel, team vs. solo).
5.  **Hypothesize & Test Career Clusters:**
    *   Based on the conversation, synthesize and propose 3-5 broad career clusters (e.g., "Based on what you've shared about your love for creative problem-solving and visual arts, I'm noticing a connection to the 'Design & Creative Fields' cluster.").
    *   For each cluster, ask a targeted, scenario-style question to gauge their interest (e.g., "Let's imagine for a moment: You're leading a team to design a new mobile app that helps people learn a language. How does that kind of challenge feel to you?").
6.  **Refine & Conclude:**
    *   Based on their reactions, narrow down the list to 2-3 prioritized career paths.
    *   Check for satisfaction. Ask: "Does this direction feel like a good starting point for your exploration?" or "Do you have any other questions for me?".
    *   When the student expresses satisfaction or has no more questions, set \`isConcluding\` to \`true\` and provide a concluding remark.

**Your Response:**
Your response MUST be a valid JSON object. It has the following fields:
1.  \`nextPrompt\`: A short, engaging, open-ended question to continue the conversation.
2.  \`updatedInsights\`: A JSON object containing updated lists for "interests", "strengths", "constraints", and "careerClusters". Merge new insights with existing ones, avoiding duplicates.
3.  \`isConcluding\`: Set this to \`true\` ONLY when the student indicates they are satisfied or the conversation has reached a natural conclusion. Otherwise, omit this field or set it to \`false\`. When this is true, the 'nextPrompt' should be a summary statement like "This has been a great conversation, [Name]! I'm now putting together your personalized Career Discovery Report based on everything we've discussed."

**Student Context:**
- Name: {{{name}}}
- Grade: {{{grade}}}
- Curriculum: {{{curriculum}}}
- Stream: {{{stream}}}
- Country: {{{country}}}

**Conversation History (latest is last):**
{{{formattedConversationHistory}}}

**Current Extracted Insights (merge new findings into these):**
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

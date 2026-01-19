'use server';

/**
 * @fileOverview Extracts key insights from student responses in real-time and displays them in a side panel.
 *
 * - extractInsights - A function that handles the insight extraction process.
 * - ExtractInsightsInput - The input type for the extractInsights function.
 * - ExtractInsightsOutput - The return type for the extractInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInsightsInputSchema = z.object({
  studentResponse: z.string().describe('The student response to analyze.'),
  existingInsights: z.string().optional().describe('Existing extracted insights to build upon.'),
});
export type ExtractInsightsInput = z.infer<typeof ExtractInsightsInputSchema>;

const ExtractInsightsOutputSchema = z.object({
  interests: z.string().describe('A summary of the student\'s expressed interests.'),
  strengths: z.string().describe('A summary of the student\'s identified strengths.'),
  constraints: z.string().describe('A summary of the student\'s stated constraints and preferences.'),
  careerClusters: z.string().describe('Proposed career clusters based on the conversation.'),
});
export type ExtractInsightsOutput = z.infer<typeof ExtractInsightsOutputSchema>;

export async function extractInsights(input: ExtractInsightsInput): Promise<ExtractInsightsOutput> {
  return extractInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractInsightsPrompt',
  input: {schema: ExtractInsightsInputSchema},
  output: {schema: ExtractInsightsOutputSchema},
  prompt: `You are an AI career counselor reviewing a student\'s responses to extract key insights.

  Based on the student\'s response and any existing insights, identify and summarize their interests, strengths, constraints, and suggest potential career clusters.

  Student Response: {{{studentResponse}}}
  Existing Insights: {{{existingInsights}}}

  Output the insights in the following structured format:
  {
    "interests": "...",
    "strengths": "...",
    "constraints": "...",
    "careerClusters": "..."
  }`,
});

const extractInsightsFlow = ai.defineFlow(
  {
    name: 'extractInsightsFlow',
    inputSchema: ExtractInsightsInputSchema,
    outputSchema: ExtractInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

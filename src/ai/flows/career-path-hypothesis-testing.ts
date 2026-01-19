'use server';

/**
 * @fileOverview This file defines a Genkit flow for career path hypothesis testing.
 *
 * It proposes several potential career paths based on the student's profile and tests them against the student's preferences.
 * - careerPathHypothesisTesting - The main function that initiates the career path hypothesis testing process.
 * - CareerPathHypothesisTestingInput - The input type for the careerPathHypothesisTesting function.
 * - CareerPathHypothesisTestingOutput - The output type for the careerPathHypothesisTesting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CareerPathHypothesisTestingInputSchema = z.object({
  studentProfile: z.string().describe('A summary of the student profile including interests, strengths, and constraints.'),
  careerClusters: z.array(z.string()).describe('An array of career clusters to test (e.g., Engineering & Technology, Design & Creative Fields).'),
});
export type CareerPathHypothesisTestingInput = z.infer<typeof CareerPathHypothesisTestingInputSchema>;

const CareerPathHypothesisTestingOutputSchema = z.object({
  prioritizedPaths: z.array(z.string()).describe('An array of 2-3 prioritized career paths based on the student input.'),
  reasoning: z.string().describe('Explanation of why these paths were chosen, referencing the student profile.'),
});
export type CareerPathHypothesisTestingOutput = z.infer<typeof CareerPathHypothesisTestingOutputSchema>;

export async function careerPathHypothesisTesting(input: CareerPathHypothesisTestingInput): Promise<CareerPathHypothesisTestingOutput> {
  return careerPathHypothesisTestingFlow(input);
}

const careerPathHypothesisTestingPrompt = ai.definePrompt({
  name: 'careerPathHypothesisTestingPrompt',
  input: {schema: CareerPathHypothesisTestingInputSchema},
  output: {schema: CareerPathHypothesisTestingOutputSchema},
  prompt: `You are a career counselor helping a student identify the best career paths for them.

  Based on the student's profile:
  {{studentProfile}}

  Propose several potential career paths based on this profile, and then test these paths against the student's preferences by asking them to imagine themselves in those roles.
  Return the top 2-3 best-fit options, explaining why each path is a good fit based on the student profile. Provide the reasoning behind each choice.
  The career clusters to consider are:
  {{#each careerClusters}}
  - {{this}}
  {{/each}}
  `,
});

const careerPathHypothesisTestingFlow = ai.defineFlow(
  {
    name: 'careerPathHypothesisTestingFlow',
    inputSchema: CareerPathHypothesisTestingInputSchema,
    outputSchema: CareerPathHypothesisTestingOutputSchema,
  },
  async input => {
    const {output} = await careerPathHypothesisTestingPrompt(input);
    return output!;
  }
);

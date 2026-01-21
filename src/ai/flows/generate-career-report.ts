'use server';

/**
 * @fileOverview A flow to generate a structured career discovery report.
 *
 * - generateCareerReport - A function that synthesizes conversation insights into a final report.
 * - GenerateCareerReportOutput - The return type for the generateCareerReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCareerReportInputSchema = z.object({
  studentProfile: z.object({
    name: z.string(),
    grade: z.string(),
    curriculum: z.string(),
    country: z.string(),
  }),
  insights: z.object({
    interests: z.array(z.string()),
    strengths: z.array(z.string()),
    constraints: z.array(z.string()),
    careerClusters: z.array(z.string()),
  }),
});

const RecommendedPathSchema = z.object({
  name: z.string().describe('The name of the career path or cluster (e.g., "Product Design", "Computer Science & AI").'),
  whyItFits: z.array(z.string()).describe("2-3 bullet points explaining why this path fits the student, linking back to their specific interests and strengths."),
  applicationReadiness: z.array(z.string()).describe("2-3 bullet points with hints on how this discovery can be used in essays, SOPs, or future applications."),
});

const GenerateCareerReportOutputSchema = z.object({
  interests: z.array(z.string()).describe("A list of the student's top 3 interests."),
  strengths: z.array(z.string()).describe("A list of the student's 3-5 key strengths."),
  recommendedPaths: z.array(RecommendedPathSchema).describe('A list of the top 2-3 recommended career paths.'),
});

export type GenerateCareerReportOutput = z.infer<typeof GenerateCareerReportOutputSchema>;

export async function generateCareerReport(input: z.infer<typeof GenerateCareerReportInputSchema>): Promise<GenerateCareerReportOutput> {
  return generateCareerReportFlow(input);
}

const generateCareerReportPrompt = ai.definePrompt({
  name: 'generateCareerReportPrompt',
  input: {schema: GenerateCareerReportInputSchema},
  output: {schema: GenerateCareerReportOutputSchema},
  prompt: `You are an expert career counselor tasked with creating a final Career Discovery Report for a student.
  Synthesize the provided information into a clear, structured, and encouraging report.

  **Student Information:**
  - Name: {{{studentProfile.name}}}
  - Grade: {{{studentProfile.grade}}}
  - Full Profile & Conversation Insights: {{{json insights}}}

  **Your Task:**
  Based on all the information provided, generate a JSON object that strictly follows the output schema.

  1.  **Top Interests:** From the list of all interests, identify and return only the **top 3** most prominent or frequently mentioned ones.
  2.  **Key Strengths:** From the list of all strengths, identify and return **3 to 5** of the most significant strengths.
  3.  **Recommended Career Paths:**
      - Identify the **top 2-3** most suitable career paths or clusters from the insights.
      - For each path, you MUST provide:
        - \`whyItFits\`: 2-3 bullet points that specifically connect the path to the student's stated interests and strengths from the provided insights. Be concrete (e.g., "Your interest in 'solving puzzles' and strength in 'logical reasoning' align perfectly with a career in software engineering...").
        - \`applicationReadiness\`: 2-3 bullet points giving the student actionable advice on how they can leverage these insights for their college applications, essays, or SOPs. (e.g., "In your personal essay, you could write about how your passion for 'creative writing' led you to discover an interest in 'Marketing' through this guidance session.").

  Your response MUST be a valid JSON object matching the defined schema.
  `,
});


const generateCareerReportFlow = ai.defineFlow(
  {
    name: 'generateCareerReportFlow',
    inputSchema: GenerateCareerReportInputSchema,
    outputSchema: GenerateCareerReportOutputSchema,
  },
  async input => {
    const {output} = await generateCareerReportPrompt(input);
    return output!;
  }
);


'use server';
/**
 * @fileOverview A flow for suggesting carbon footprint improvements.
 *
 * - suggestImprovements - A function that suggests improvements based on carbon emissions data.
 * - SuggestionRequest - The input type for the suggestImprovements function.
 * - SuggestionResponse - The return type for the suggestImprovements function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestionRequestSchema = z.object({
  summary: z.object({
    totalEmissions: z.number().describe('Total emissions in kgCO2e'),
    materialEmissions: z.number().describe('Emissions from materials in kgCO2e'),
    manufacturingEmissions: z.number().describe('Emissions from manufacturing in kgCO2e'),
    implementationEmissions: z.number().describe('Emissions from implementation in kgCO2e'),
    transportEmissions: z.number().describe('Emissions from transport in kgCO2e'),
    endOfLifeEmissions: z.number().describe('Emissions from end-of-life in kgCO2e'),
  }),
  details: z.object({
    materials: z.array(z.string()).describe('Details of material emissions'),
    manufacturing: z.array(z.string()).describe('Details of manufacturing emissions'),
    implementation: z.array(z.string()).describe('Details of implementation emissions'),
    transport: z.array(z.string()).describe('Details of transport emissions'),
    endOfLife: z.array(z.string()).describe('Details of end-of-life emissions'),
  }),
  comments: z.string().optional().describe('User provided comments or assumptions.'),
});
export type SuggestionRequest = z.infer<typeof SuggestionRequestSchema>;

const SuggestionResponseSchema = z.object({
  assessment: z.string().describe("A brief, one or two sentence assessment of the carbon footprint."),
  recommendations: z.array(z.string()).describe("A list of specific, actionable recommendations for improvement."),
});
export type SuggestionResponse = z.infer<typeof SuggestionResponseSchema>;


const prompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: { schema: SuggestionRequestSchema },
  output: { schema: SuggestionResponseSchema },
  prompt: `
    You are an expert in carbon footprint analysis for construction and manufacturing projects.
    Your task is to analyze the provided carbon emission data and provide a concise assessment and actionable recommendations for improvement.
    The analysis should be in French.

    Analyze the following data:
    - Total Emissions: {{{summary.totalEmissions}}} kgCO2e
    - Material Emissions: {{{summary.materialEmissions}}} kgCO2e
    - Manufacturing Emissions: {{{summary.manufacturingEmissions}}} kgCO2e
    - Implementation Emissions: {{{summary.implementationEmissions}}} kgCO2e
    - Transport Emissions: {{{summary.transportEmissions}}} kgCO2e
    - End-of-Life Emissions: {{{summary.endOfLifeEmissions}}} kgCO2e

    Emission Details:
    - Materials: {{#each details.materials}} {{{this}}}; {{/each}}
    - Manufacturing: {{#each details.manufacturing}} {{{this}}}; {{/each}}
    - Implementation: {{#each details.implementation}} {{{this}}}; {{/each}}
    - Transport: {{#each details.transport}} {{{this}}}; {{/each}}
    - End-of-Life: {{#each details.endOfLife}} {{{this}}}; {{/each}}

    User Comments: {{{comments}}}

    Based on this data, provide:
    1.  **Assessment (assessment)**: A brief, one or two sentence summary identifying the main emission hotspots.
    2.  **Recommendations (recommendations)**: A list of 3-5 specific, actionable recommendations. Focus on the areas with the highest impact. For example, suggest alternative materials, different transport modes, or process optimizations.
  `,
});

const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestionRequestSchema,
    outputSchema: SuggestionResponseSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function suggestImprovements(input: SuggestionRequest): Promise<SuggestionResponse> {
  return suggestImprovementsFlow(input);
}

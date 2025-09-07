'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting carbon footprint improvements based on a supplier's tender submission.
 *
 * - suggestCarbonImprovements - A function that takes tender details as input and returns AI-powered suggestions for reducing the carbon footprint.
 * - SuggestCarbonImprovementsInput - The input type for the suggestCarbonImprovements function.
 * - SuggestCarbonImprovementsOutput - The return type for the suggestCarbonImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCarbonImprovementsInputSchema = z.object({
  rawMaterials: z.string().describe('Details about raw materials used.'),
  manufacturing: z.string().describe('Details about the manufacturing process.'),
  transport: z.string().describe('Details about transportation methods.'),
  usage: z.string().describe('Details about product usage.'),
  endOfLife: z.string().describe('Details about the product end-of-life management.'),
});
export type SuggestCarbonImprovementsInput = z.infer<typeof SuggestCarbonImprovementsInputSchema>;

const SuggestCarbonImprovementsOutputSchema = z.object({
  suggestions: z.string().describe('AI-powered suggestions for reducing the carbon footprint.'),
});
export type SuggestCarbonImprovementsOutput = z.infer<typeof SuggestCarbonImprovementsOutputSchema>;

export async function suggestCarbonImprovements(
  input: SuggestCarbonImprovementsInput
): Promise<SuggestCarbonImprovementsOutput> {
  return suggestCarbonImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCarbonImprovementsPrompt',
  input: {schema: SuggestCarbonImprovementsInputSchema},
  output: {schema: SuggestCarbonImprovementsOutputSchema},
  prompt: `As a sustainability expert, review the following details of a supplier's tender submission and provide actionable suggestions for reducing their carbon footprint.

Raw Materials: {{{rawMaterials}}}
Manufacturing: {{{manufacturing}}}
Transport: {{{transport}}}
Usage: {{{usage}}}
EndOfLife: {{{endOfLife}}}

Suggestions:`,
});

const suggestCarbonImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestCarbonImprovementsFlow',
    inputSchema: SuggestCarbonImprovementsInputSchema,
    outputSchema: SuggestCarbonImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

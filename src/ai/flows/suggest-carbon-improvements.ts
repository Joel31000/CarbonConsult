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
  rawMaterials: z.string().describe('Détails sur les matières premières utilisées.'),
  manufacturing: z.string().describe('Détails sur le processus de fabrication.'),
  transport: z.string().describe('Détails sur les méthodes de transport.'),
  usage: z.string().describe('Détails sur l\'utilisation du produit.'),
  endOfLife: z.string().describe('Détails sur la gestion de fin de vie du produit.'),
});
export type SuggestCarbonImprovementsInput = z.infer<typeof SuggestCarbonImprovementsInputSchema>;

const SuggestCarbonImprovementsOutputSchema = z.object({
  suggestions: z.string().describe('Suggestions basées sur l\'IA pour réduire l\'empreinte carbone.'),
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
  prompt: `En tant qu'expert en développement durable, examinez les détails suivants de la soumission d'un fournisseur et fournissez des suggestions concrètes pour réduire leur empreinte carbone.

Matières premières: {{{rawMaterials}}}
Fabrication: {{{manufacturing}}}
Transport: {{{transport}}}
Utilisation: {{{usage}}}
Fin de vie: {{{endOfLife}}}

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

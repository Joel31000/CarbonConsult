
"use server";

import {
  suggestCarbonImprovements,
  type SuggestCarbonImprovementsInput,
} from "@/ai/flows/suggest-carbon-improvements";

/**
 * Mocks saving the submission data to a database like Firestore.
 * @param data The form submission data.
 * @returns A promise that resolves with a success status.
 */
export async function saveSubmission(data: unknown) {
  console.log("Saving submission:", data);
  // In a real application, you would save this data to Firestore.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true, message: "Soumission enregistrée avec succès !" };
}

/**
 * Calls the Genkit AI flow to get carbon improvement suggestions.
 * @param input The formatted input for the AI model.
 * @returns A promise that resolves with the AI's suggestions or an error.
 */
export async function getAiSuggestions(input: SuggestCarbonImprovementsInput) {
  try {
    const result = await suggestCarbonImprovements(input);
    return { success: true, suggestions: result.suggestions };
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return {
      success: false,
      error: "Échec de l'obtention des suggestions du modèle d'IA.",
    };
  }
}

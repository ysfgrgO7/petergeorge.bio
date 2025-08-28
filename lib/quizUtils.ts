// lib/quizUtils.ts

/**
 * Returns a random quiz variant from the available variants
 * @returns string - One of: 'variant1Quizzes', 'variant2Quizzes', 'variant3Quizzes'
 */
export const getRandomQuizVariant = (): string => {
  const variants = ["variant1Quizzes", "variant2Quizzes", "variant3Quizzes"];
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex];
};

/**
 * Get all available quiz variants
 * @returns string[] - Array of all quiz variant names
 */
export const getAllQuizVariants = (): string[] => {
  return ["variant1Quizzes", "variant2Quizzes", "variant3Quizzes"];
};

/**
 * Gets an unused quiz variant, or a random one if all have been used
 * @param usedVariants - Array of already used variant names
 * @returns string - An unused variant name, or random if all used
 */
export const getUnusedQuizVariant = (usedVariants: string[] = []): string => {
  const allVariants = getAllQuizVariants();
  const unusedVariants = allVariants.filter(
    (variant) => !usedVariants.includes(variant)
  );

  // If there are unused variants, pick one randomly
  if (unusedVariants.length > 0) {
    const randomIndex = Math.floor(Math.random() * unusedVariants.length);
    return unusedVariants[randomIndex];
  }

  // If all variants have been used, return a random one
  return getRandomQuizVariant();
};

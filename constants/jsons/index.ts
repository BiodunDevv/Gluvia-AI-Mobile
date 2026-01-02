// JSON Response Data
// Export all response templates for the chat AI
// These JSONs serve as training data for response generation

import greetingsData from "./greetings.json";
import healthQuestionsData from "./health-questions.json";
import healthTopicsData from "./health-topics.json";
import negativeFeedbackData from "./negative-feedback.json";
import offTopicData from "./off-topic.json";

// Type definitions for the JSON structures
export type HealthQuestions = typeof healthQuestionsData;
export type OffTopic = typeof offTopicData;
export type NegativeFeedback = typeof negativeFeedbackData;
export type Greetings = typeof greetingsData;
export type HealthTopics = typeof healthTopicsData;

// Export the data
export const healthQuestions = healthQuestionsData;
export const offTopic = offTopicData;
export const negativeFeedback = negativeFeedbackData;
export const greetings = greetingsData;
export const healthTopics = healthTopicsData;

// Helper function to check if a message matches any pattern in a list
export const matchesPatterns = (
  message: string,
  patterns: string[]
): boolean => {
  const lowerMessage = message.toLowerCase().trim();
  return patterns.some((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    // Check for exact match, word boundary match, or contains
    return (
      lowerMessage === lowerPattern ||
      lowerMessage.includes(lowerPattern) ||
      new RegExp(`\\b${lowerPattern}\\b`, "i").test(lowerMessage)
    );
  });
};

// Helper function to get random response from array
export const getRandomResponse = <T>(responses: T[]): T => {
  return responses[Math.floor(Math.random() * responses.length)];
};

// Helper function to replace template variables
export const fillTemplate = (
  template: string,
  variables: Record<string, string | number>
): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  });
  return result;
};

// Get time of day for time-aware responses
export const getTimeOfDay = ():
  | "morning"
  | "afternoon"
  | "evening"
  | "night" => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

// Detect message intent categories
export const detectIntent = (
  message: string
): {
  isGreeting: boolean;
  isThanks: boolean;
  isGoodbye: boolean;
  isHowAreYou: boolean;
  isWhoAreYou: boolean;
  isHelp: boolean;
  isNegative: boolean;
  isNegativeMild: boolean;
  isNegativeModerate: boolean;
  isNegativeSevere: boolean;
  isNegativeFrustration: boolean;
  isNegativeTaunting: boolean;
  isOffTopic: boolean;
  isProfileQuestion: boolean;
  isHealthTopic: boolean;
  isMealRequest: boolean;
  isPositiveReaction: boolean;
  isAcknowledgment: boolean;
} => {
  const lowerMessage = message.toLowerCase().trim();

  return {
    isGreeting: matchesPatterns(lowerMessage, greetingsData.greetings.patterns),
    isThanks: matchesPatterns(lowerMessage, greetingsData.thanks.patterns),
    isGoodbye: matchesPatterns(lowerMessage, greetingsData.goodbye.patterns),
    isHowAreYou: matchesPatterns(
      lowerMessage,
      greetingsData.howAreYou.patterns
    ),
    isWhoAreYou: matchesPatterns(
      lowerMessage,
      greetingsData.whoAreYou.patterns
    ),
    isHelp: matchesPatterns(lowerMessage, greetingsData.help.patterns),
    isNegative: matchesPatterns(lowerMessage, [
      ...negativeFeedbackData.patterns.mild,
      ...negativeFeedbackData.patterns.moderate,
      ...negativeFeedbackData.patterns.severe,
      ...negativeFeedbackData.patterns.frustration,
      ...negativeFeedbackData.patterns.taunting,
    ]),
    isNegativeMild: matchesPatterns(
      lowerMessage,
      negativeFeedbackData.patterns.mild
    ),
    isNegativeModerate: matchesPatterns(
      lowerMessage,
      negativeFeedbackData.patterns.moderate
    ),
    isNegativeSevere: matchesPatterns(
      lowerMessage,
      negativeFeedbackData.patterns.severe
    ),
    isNegativeFrustration: matchesPatterns(
      lowerMessage,
      negativeFeedbackData.patterns.frustration
    ),
    isNegativeTaunting: matchesPatterns(
      lowerMessage,
      negativeFeedbackData.patterns.taunting
    ),
    isOffTopic: Object.values(offTopicData.categories).some((cat) =>
      matchesPatterns(lowerMessage, cat.patterns)
    ),
    isProfileQuestion: Object.values(healthQuestionsData).some((topic) => {
      if (typeof topic === "object" && topic !== null && "patterns" in topic) {
        return matchesPatterns(
          lowerMessage,
          (topic as { patterns: string[] }).patterns
        );
      }
      return false;
    }),
    isHealthTopic: matchesPatterns(lowerMessage, [
      ...healthTopicsData.lowGI.patterns,
      ...healthTopicsData.bloodSugar.patterns,
      ...healthTopicsData.diabetes.patterns,
      ...healthTopicsData.nigerianFood.patterns,
    ]),
    isMealRequest: Object.values(healthTopicsData.mealTypes).some((meal) =>
      matchesPatterns(lowerMessage, meal.patterns)
    ),
    isPositiveReaction: matchesPatterns(
      lowerMessage,
      greetingsData.positiveReaction.patterns
    ),
    isAcknowledgment: matchesPatterns(
      lowerMessage,
      greetingsData.acknowledgment.patterns
    ),
  };
};

/**
 * Meal Recommendation Engine
 *
 * Professional meal recommendation system for diabetes management.
 * Uses food data and rule templates to generate personalized recommendations
 * based on user profile, time of day, and health constraints.
 */

import { UserProfile } from "@/store/auth-store";

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Food {
  _id: string;
  localName: string;
  canonicalName?: string;
  category?: string;
  nutrients: {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fibre_g: number;
    gi: number | null;
  };
  portionSizes: Array<{
    name: string;
    grams: number;
    carbs_g?: number;
  }>;
  affordability?: "low" | "medium" | "high";
  tags?: string[];
  imageUrl?: string;
  regionVariants?: Array<{
    region: string;
    note: string;
  }>;
  source?: "manual" | "validated" | "estimated";
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleTemplate {
  _id: string;
  slug: string;
  title: string;
  type:
    | "constraint"
    | "scoring"
    | "substitution"
    | "portion_adjustment"
    | "alert";
  definition: Record<string, any>;
  nlTemplate?: string;
  appliesTo?: string[];
  deleted: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedFood extends Food {
  score: number;
  reasons: string[];
  alerts: Alert[];
  suggestedPortion: {
    name: string;
    grams: number;
    carbs_g: number;
  };
}

export interface Alert {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface MealRecommendation {
  mealType: MealType;
  timeContext: string;
  mainDishes: RecommendedFood[];
  sideDishes: RecommendedFood[];
  proteins: RecommendedFood[];
  snacks: RecommendedFood[];
  totalNutrients: {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fibre_g: number;
  };
  maxCarbsAllowed: number;
  alerts: Alert[];
  tips: string[];
}

export interface UserContext {
  profile?: UserProfile;
  lastGlucose?: number;
  todaysMeals?: { mealType: MealType; carbs: number }[];
}

// ============================================================
// TIME-BASED MEAL DETECTION
// ============================================================

/**
 * Get the current meal type based on time of day
 */
export function getCurrentMealType(): MealType {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "snack";
  if (hour >= 18 && hour < 22) return "dinner";

  // Late night snack
  return "snack";
}

/**
 * Get time context message for the current period
 */
export function getTimeContextMessage(mealType: MealType): string {
  const hour = new Date().getHours();
  const messages: Record<MealType, string[]> = {
    breakfast: [
      "Good morning! Start your day with a balanced breakfast.",
      "A nutritious breakfast helps maintain stable blood sugar throughout the morning.",
      "Morning meals are important - choose foods with fiber and protein.",
    ],
    lunch: [
      "Time for a satisfying midday meal!",
      "A balanced lunch keeps your energy steady for the afternoon.",
      "Include vegetables and lean protein for a diabetes-friendly lunch.",
    ],
    dinner: [
      "Good evening! Let's plan a light, nutritious dinner.",
      "Evening meals should be lighter to support overnight glucose control.",
      "Aim for vegetables, protein, and controlled carbs for dinner.",
    ],
    snack: [
      hour >= 22 || hour < 5
        ? "Late night? Choose a light, low-carb snack if needed."
        : "Time for a healthy snack to maintain energy levels.",
      "Smart snacking helps prevent blood sugar dips between meals.",
      "Nuts, vegetables, or protein-rich snacks are great choices.",
    ],
  };

  return messages[mealType][
    Math.floor(Math.random() * messages[mealType].length)
  ];
}

/**
 * Get meal-specific recommendations
 * Carb ranges based on American Diabetes Association guidelines
 * for type 2 diabetes: 45-60g per meal, 15-20g per snack
 */
export function getMealTypeInfo(mealType: MealType): {
  title: string;
  icon: string;
  description: string;
  carbRange: { min: number; max: number };
  priorities: string[];
} {
  const info: Record<MealType, ReturnType<typeof getMealTypeInfo>> = {
    breakfast: {
      title: "Breakfast",
      icon: "☀️",
      description: "Start your day right with a balanced meal",
      carbRange: { min: 30, max: 45 },
      priorities: ["fiber", "protein", "low-gi"],
    },
    lunch: {
      title: "Lunch",
      icon: "🌤️",
      description: "Midday fuel to keep you energized",
      carbRange: { min: 45, max: 60 },
      priorities: ["vegetables", "protein", "whole-grain"],
    },
    dinner: {
      title: "Dinner",
      icon: "🌙",
      description: "A lighter evening meal for better sleep",
      carbRange: { min: 45, max: 60 },
      priorities: ["vegetables", "protein", "low-carb"],
    },
    snack: {
      title: "Snack",
      icon: "🍎",
      description: "Smart choices between meals",
      carbRange: { min: 15, max: 20 },
      priorities: ["protein", "nuts", "low-carb"],
    },
  };

  return info[mealType];
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Fill template placeholders with actual food data and rule context
 * Converts {{food.fibre_g}} to actual fiber value, etc.
 */
function fillTemplateWithFoodData(
  template: string | undefined,
  food: Food,
  userContext?: UserContext,
  ruleContext?: {
    maxCarbs_g?: number;
    minProtein_g?: number;
    minFibre_g?: number;
    carbFiberRatio?: number;
    portionMultiplier?: number;
    severity?: string;
    alert?: string;
    recommendation?: string;
    explanation?: string;
    mealType?: MealType;
  }
): string {
  if (!template) return "";

  let result = template;

  // Food nutrients - handle both with and without units
  result = result.replace(
    /\{\{food\.fibre_g\}\}g?/gi,
    `${food.nutrients.fibre_g}g`
  );
  result = result.replace(
    /\{\{food\.carbs_g\}\}g?/gi,
    `${food.nutrients.carbs_g}g`
  );
  result = result.replace(
    /\{\{food\.protein_g\}\}g?/gi,
    `${food.nutrients.protein_g}g`
  );
  result = result.replace(
    /\{\{food\.fat_g\}\}g?/gi,
    `${food.nutrients.fat_g}g`
  );
  result = result.replace(
    /\{\{food\.calories\}\}/gi,
    `${food.nutrients.calories}`
  );
  result = result.replace(
    /\{\{food\.gi\}\}/gi,
    `${food.nutrients.gi ?? "N/A"}`
  );

  // Food info
  result = result.replace(/\{\{food\.localName\}\}/gi, food.localName);
  result = result.replace(/\{\{food\.name\}\}/gi, food.localName);
  result = result.replace(/\{\{food\.category\}\}/gi, food.category || "food");
  result = result.replace(
    /\{\{food\.affordability\}\}/gi,
    food.affordability || "medium"
  );

  // Calculate carb-fiber ratio
  const carbFiberRatio =
    food.nutrients.carbs_g > 0
      ? (food.nutrients.fibre_g / food.nutrients.carbs_g).toFixed(2)
      : "0";
  result = result.replace(/\{\{carbFiberRatio\}\}/gi, carbFiberRatio);

  // Rule context variables
  if (ruleContext) {
    if (ruleContext.maxCarbs_g !== undefined) {
      result = result.replace(
        /\{\{maxCarbs_g\}\}/gi,
        `${ruleContext.maxCarbs_g}g`
      );
    }
    if (ruleContext.minProtein_g !== undefined) {
      result = result.replace(
        /\{\{minProtein_g\}\}/gi,
        `${ruleContext.minProtein_g}g`
      );
    }
    if (ruleContext.minFibre_g !== undefined) {
      result = result.replace(
        /\{\{minFibre_g\}\}/gi,
        `${ruleContext.minFibre_g}g`
      );
    }
    if (ruleContext.portionMultiplier !== undefined) {
      result = result.replace(
        /\{\{portionMultiplier\}\}/gi,
        `${ruleContext.portionMultiplier}`
      );
    }
    if (ruleContext.severity) {
      result = result.replace(/\{\{severity\}\}/gi, ruleContext.severity);
    }
    if (ruleContext.alert) {
      result = result.replace(/\{\{alert\}\}/gi, ruleContext.alert);
    }
    if (ruleContext.recommendation) {
      result = result.replace(
        /\{\{recommendation\}\}/gi,
        ruleContext.recommendation
      );
    }
    if (ruleContext.explanation) {
      result = result.replace(/\{\{explanation\}\}/gi, ruleContext.explanation);
    }
    if (ruleContext.mealType) {
      result = result.replace(/\{\{mealType\}\}/gi, ruleContext.mealType);
    }
  }

  // User context
  if (userContext?.profile) {
    result = result.replace(
      /\{\{user\.bmi\}\}/gi,
      `${userContext.profile.bmi ?? "N/A"}`
    );
    result = result.replace(
      /\{\{user\.diabetesType\}\}/gi,
      userContext.profile.diabetesType || "Type 2"
    );
    result = result.replace(
      /\{\{user\.weight\}\}/gi,
      `${userContext.profile.weightKg ?? "N/A"}kg`
    );
  }
  if (userContext?.lastGlucose) {
    result = result.replace(
      /\{\{user\.glucose\}\}/gi,
      `${userContext.lastGlucose}`
    );
    result = result.replace(
      /\{\{user\.lastGlucose\}\}/gi,
      `${userContext.lastGlucose}`
    );
  }

  // Clean up any remaining unmatched placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, "");

  return result.trim();
}

// ============================================================
// SCORING AND FILTERING FUNCTIONS
// ============================================================

/**
 * Calculate base score for a food item based on nutrients
 */
function calculateBaseScore(food: Food, userContext: UserContext): number {
  let score = 50; // Base score

  const gi = food.nutrients.gi ?? 50;
  const carbs = food.nutrients.carbs_g;
  const fiber = food.nutrients.fibre_g;
  const protein = food.nutrients.protein_g;

  // Glycemic Index scoring (lower is better for diabetes)
  if (gi <= 35) {
    score += 25;
  } else if (gi <= 55) {
    score += 15;
  } else if (gi <= 70) {
    score += 0;
  } else {
    score -= 15;
  }

  // Fiber bonus (higher is better)
  if (fiber >= 5) {
    score += 15;
  } else if (fiber >= 3) {
    score += 10;
  } else if (fiber >= 1) {
    score += 5;
  }

  // Protein bonus (good for satiety and blood sugar stability)
  if (protein >= 15) {
    score += 15;
  } else if (protein >= 8) {
    score += 10;
  } else if (protein >= 3) {
    score += 5;
  }

  // Carb-to-fiber ratio bonus
  if (carbs > 0) {
    const carbFiberRatio = fiber / carbs;
    if (carbFiberRatio > 0.15) {
      score += 10;
    } else if (carbFiberRatio > 0.1) {
      score += 5;
    }
  }

  // Tags-based scoring
  const tags = food.tags || [];
  if (tags.includes("diabetes-friendly")) score += 20;
  if (tags.includes("high-fibre")) score += 10;
  if (tags.includes("protein")) score += 10;
  if (tags.includes("whole-grain")) score += 10;
  if (tags.includes("healthy-fat")) score += 8;
  if (tags.includes("low-carb")) score += 8;

  // Penalty for certain tags
  if (tags.includes("high-gi")) score -= 15;
  if (tags.includes("fried")) score -= 10;
  if (tags.includes("processed")) score -= 10;
  if (tags.includes("sugary")) score -= 25;
  if (tags.includes("limit-portions")) score -= 5;

  // User context adjustments
  if (userContext.profile) {
    // Affordability preference
    if (
      userContext.profile.incomeBracket === "low" &&
      food.affordability === "low"
    ) {
      score += 10;
    }

    // BMI-based adjustments
    const bmi = userContext.profile.bmi ?? 25;
    if (bmi >= 30) {
      // For overweight users, prioritize low-calorie, high-fiber foods
      if (food.nutrients.calories < 150) score += 10;
      if (fiber >= 3) score += 5;
    }
  }

  // Glucose-based adjustments
  if (userContext.lastGlucose) {
    if (userContext.lastGlucose > 180) {
      // High glucose - penalize high GI foods more
      if (gi > 70) score -= 20;
      if (gi > 55) score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Apply rules to generate alerts and adjust scores
 */
function applyRules(
  food: Food,
  rules: RuleTemplate[],
  userContext: UserContext,
  mealType: MealType
): { scoreAdjustment: number; alerts: Alert[]; reasons: string[] } {
  let scoreAdjustment = 0;
  const alerts: Alert[] = [];
  const reasons: string[] = [];

  for (const rule of rules) {
    // Skip deleted rules
    if (rule.deleted) continue;

    // Check if rule applies to this food category
    const appliesTo = rule.appliesTo || ["all"];
    if (
      !appliesTo.includes("all") &&
      food.category &&
      !appliesTo.includes(food.category)
    ) {
      continue;
    }

    // Process rule based on type
    switch (rule.type) {
      case "scoring":
        const scoringResult = evaluateScoringRule(
          food,
          rule,
          userContext,
          mealType
        );
        scoreAdjustment += scoringResult.scoreBonus;
        if (scoringResult.reason) reasons.push(scoringResult.reason);
        break;

      case "alert":
        const alertResult = evaluateAlertRule(
          food,
          rule,
          userContext,
          mealType
        );
        if (alertResult) alerts.push(alertResult);
        break;

      case "constraint":
        const constraintAlert = evaluateConstraintRule(
          food,
          rule,
          userContext,
          mealType
        );
        if (constraintAlert) alerts.push(constraintAlert);
        break;

      case "portion_adjustment":
        // Handle portion adjustments in the recommendation phase
        break;

      case "substitution":
        // Handle substitutions separately
        break;
    }
  }

  return { scoreAdjustment, alerts, reasons };
}

/**
 * Evaluate a scoring rule
 */
function evaluateScoringRule(
  food: Food,
  rule: RuleTemplate,
  userContext: UserContext,
  mealType: MealType
): { scoreBonus: number; reason: string | null } {
  const definition = rule.definition;
  const logic = definition.logic || [];

  for (const condition of logic) {
    if (condition.when === "default") {
      const ruleContext = {
        mealType,
        ...condition.then,
      };
      const reason =
        condition.then?.priority === "high" && rule.nlTemplate
          ? fillTemplateWithFoodData(
              rule.nlTemplate,
              food,
              userContext,
              ruleContext
            )
          : null;
      return {
        scoreBonus: condition.then?.scoreBonus || 0,
        reason,
      };
    }

    // Evaluate condition
    const matches = evaluateCondition(
      condition.when,
      food,
      userContext,
      mealType
    );
    if (matches) {
      const ruleContext = {
        mealType,
        ...condition.then,
      };
      const reason =
        condition.then?.priority !== "low" && rule.nlTemplate
          ? fillTemplateWithFoodData(
              rule.nlTemplate,
              food,
              userContext,
              ruleContext
            )
          : null;
      return {
        scoreBonus: condition.then?.scoreBonus || 0,
        reason,
      };
    }
  }

  return { scoreBonus: 0, reason: null };
}

/**
 * Evaluate an alert rule
 */
function evaluateAlertRule(
  food: Food,
  rule: RuleTemplate,
  userContext: UserContext,
  mealType: MealType
): Alert | null {
  const definition = rule.definition;
  const logic = definition.logic || [];

  for (const condition of logic) {
    if (
      condition.when === "default" ||
      condition.then?.alert === "none" ||
      condition.then?.severity === "low"
    ) {
      continue;
    }

    const matches = evaluateCondition(
      condition.when,
      food,
      userContext,
      mealType
    );
    if (matches && condition.then?.alert) {
      const ruleContext = {
        mealType,
        alert: condition.then.alert,
        severity: condition.then.severity,
        ...condition.then,
      };
      const message = rule.nlTemplate
        ? fillTemplateWithFoodData(
            rule.nlTemplate,
            food,
            userContext,
            ruleContext
          )
        : rule.title;
      return {
        type: condition.then.alert,
        severity: condition.then.severity || "medium",
        message,
      };
    }
  }

  return null;
}

/**
 * Evaluate a constraint rule
 */
function evaluateConstraintRule(
  food: Food,
  rule: RuleTemplate,
  userContext: UserContext,
  mealType: MealType
): Alert | null {
  const definition = rule.definition;
  const logic = definition.logic || [];

  for (const condition of logic) {
    const matches = evaluateCondition(
      condition.when,
      food,
      userContext,
      mealType
    );

    if (matches && condition.then?.maxCarbs_g) {
      const smallestPortion = food.portionSizes[0];
      if (
        smallestPortion &&
        smallestPortion.carbs_g &&
        smallestPortion.carbs_g > condition.then.maxCarbs_g
      ) {
        const ruleContext = {
          mealType,
          maxCarbs_g: condition.then.maxCarbs_g,
          severity: condition.then.severity,
          ...condition.then,
        };
        const message = rule.nlTemplate
          ? fillTemplateWithFoodData(
              rule.nlTemplate,
              food,
              userContext,
              ruleContext
            )
          : `This food may exceed your recommended carb limit of ${condition.then.maxCarbs_g}g per meal.`;
        return {
          type: "carb_limit_exceeded",
          severity: condition.then.severity || "medium",
          message,
        };
      }
    }
  }

  return null;
}

/**
 * Simple condition evaluator
 */
function evaluateCondition(
  condition: string,
  food: Food,
  userContext: UserContext,
  mealType: MealType
): boolean {
  try {
    // Handle common conditions
    const gi = food.nutrients.gi ?? 50;
    const protein = food.nutrients.protein_g;
    const carbs = food.nutrients.carbs_g;
    const fiber = food.nutrients.fibre_g;
    const tags = food.tags || [];
    const category = food.category || "";
    const bmi = userContext.profile?.bmi ?? 25;
    const diabetesType = userContext.profile?.diabetesType || "type2";
    const lastGlucose = userContext.lastGlucose ?? 100;

    // Simple pattern matching for common conditions
    if (condition.includes("food.gi > 70")) return gi > 70;
    if (condition.includes("food.gi > 55")) return gi > 55;
    if (condition.includes("food.gi <= 70")) return gi <= 70;

    if (
      condition.includes("food.protein_g > 15") &&
      condition.includes("food.carbs_g < 10")
    )
      return protein > 15 && carbs < 10;
    if (condition.includes("food.protein_g > 10")) return protein > 10;

    if (condition.includes("food.fibre_g > 5")) return fiber > 5;
    if (condition.includes("food.fibre_g > 3")) return fiber > 3;

    if (condition.includes("food.tags.includes('fried')"))
      return tags.includes("fried");
    if (condition.includes("food.tags.includes('fermented')"))
      return tags.includes("fermented");
    if (condition.includes("food.tags.includes('whole-grain')"))
      return tags.includes("whole-grain");

    if (condition.includes("food.category === 'Fruits & Vegetables'"))
      return category === "Fruits & Vegetables";
    if (condition.includes("food.category === 'Grains & Staples'"))
      return category === "Grains & Staples";
    if (condition.includes("food.category === 'Protein Foods'"))
      return category === "Protein Foods";

    if (condition.includes("user.bmi >= 30")) return bmi >= 30;
    if (condition.includes("user.lastGlucose > 180")) return lastGlucose > 180;

    if (condition.includes("meal.timeOfDay === 'breakfast'"))
      return mealType === "breakfast";
    if (condition.includes("meal.timeOfDay === 'dinner'"))
      return mealType === "dinner";

    if (condition.includes("user.diabetesType === 'type1'"))
      return diabetesType === "type1";
    if (condition.includes("user.diabetesType === 'type2'"))
      return diabetesType === "type2";

    return false;
  } catch {
    return false;
  }
}

/**
 * Get suggested portion based on user context and rules
 */
function getSuggestedPortion(
  food: Food,
  userContext: UserContext,
  mealType: MealType,
  rules: RuleTemplate[]
): { name: string; grams: number; carbs_g: number } {
  // Default to smallest portion for diabetes management
  const portions = food.portionSizes;
  if (!portions || portions.length === 0) {
    return { name: "1 serving", grams: 100, carbs_g: food.nutrients.carbs_g };
  }

  let portionIndex = 0; // Start with smallest
  let multiplier = 1;

  // Apply portion adjustments based on user context
  const bmi = userContext.profile?.bmi ?? 25;
  const activityLevel = userContext.profile?.activityLevel || "moderate";

  // For overweight users or high glucose, use smaller portions
  if (bmi >= 30 || (userContext.lastGlucose && userContext.lastGlucose > 150)) {
    multiplier = 0.75;
  }
  // For highly active users with normal glucose, allow slightly larger portions
  else if (
    activityLevel === "high" &&
    (!userContext.lastGlucose || userContext.lastGlucose < 120)
  ) {
    multiplier = 1.1;
  }

  // Dinner portions should be smaller
  if (mealType === "dinner") {
    multiplier *= 0.85;
  }

  // Snack portions should be smallest
  if (mealType === "snack") {
    portionIndex = 0;
    multiplier *= 0.7;
  }

  const basePortion = portions[portionIndex];
  const adjustedGrams = Math.round(basePortion.grams * multiplier);
  const carbsPerGram =
    (basePortion.carbs_g ||
      (food.nutrients.carbs_g * basePortion.grams) / 100) / basePortion.grams;
  const adjustedCarbs = Math.round(adjustedGrams * carbsPerGram * 10) / 10;

  return {
    name: basePortion.name,
    grams: adjustedGrams,
    carbs_g: adjustedCarbs,
  };
}

// ============================================================
// MAIN RECOMMENDATION FUNCTIONS
// ============================================================

/**
 * Generate meal recommendations based on available foods and rules
 */
export function generateMealRecommendation(
  foods: Food[],
  rules: RuleTemplate[],
  userContext: UserContext,
  mealType: MealType
): MealRecommendation {
  const mealInfo = getMealTypeInfo(mealType);
  const timeContext = getTimeContextMessage(mealType);

  // Calculate max carbs allowed based on user context and rules
  let maxCarbs = mealInfo.carbRange.max;
  const profile = userContext.profile;

  if (profile?.diabetesType === "type1") {
    maxCarbs = Math.min(maxCarbs, 40);
  }
  if (userContext.lastGlucose && userContext.lastGlucose > 180) {
    maxCarbs = Math.min(maxCarbs, 30);
  }
  if (profile?.bmi && profile.bmi >= 30) {
    maxCarbs = Math.min(maxCarbs, 35);
  }

  // Score and categorize all foods
  const scoredFoods: RecommendedFood[] = foods
    .filter((f) => !f.deleted)
    .map((food) => {
      const baseScore = calculateBaseScore(food, userContext);
      const { scoreAdjustment, alerts, reasons } = applyRules(
        food,
        rules,
        userContext,
        mealType
      );
      const suggestedPortion = getSuggestedPortion(
        food,
        userContext,
        mealType,
        rules
      );

      // Generate reasons based on food properties
      const finalReasons = [...reasons];
      if (food.nutrients.gi && food.nutrients.gi <= 55) {
        finalReasons.push("Low glycemic index - gentle on blood sugar");
      }
      if (food.nutrients.fibre_g >= 5) {
        finalReasons.push("High in fiber - helps slow glucose absorption");
      }
      if (food.nutrients.protein_g >= 10) {
        finalReasons.push("Good protein source - promotes satiety");
      }
      if (food.tags?.includes("diabetes-friendly")) {
        finalReasons.push("Recommended for diabetes management");
      }

      return {
        ...food,
        score: Math.max(0, Math.min(100, baseScore + scoreAdjustment)),
        reasons: finalReasons.slice(0, 3), // Max 3 reasons
        alerts,
        suggestedPortion,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Categorize foods
  const categories = {
    mainDishes: ["Grains & Staples"],
    sideDishes: ["Fruits & Vegetables", "Soups & Stews"],
    proteins: ["Protein Foods"],
    snacks: ["Snacks", "Beverages", "Dairy"],
  };

  const mainDishes = scoredFoods
    .filter((f) => categories.mainDishes.includes(f.category || ""))
    .slice(0, 5);

  const sideDishes = scoredFoods
    .filter((f) => categories.sideDishes.includes(f.category || ""))
    .slice(0, 5);

  const proteins = scoredFoods
    .filter((f) => categories.proteins.includes(f.category || ""))
    .slice(0, 5);

  const snacks = scoredFoods
    .filter((f) => categories.snacks.includes(f.category || ""))
    .slice(0, 5);

  // Generate overall alerts
  const overallAlerts: Alert[] = [];

  if (userContext.lastGlucose && userContext.lastGlucose > 180) {
    overallAlerts.push({
      type: "high_glucose",
      severity: "high",
      message:
        "Your glucose is elevated. Choose low-GI foods and watch portion sizes.",
    });
  }

  if (userContext.lastGlucose && userContext.lastGlucose < 70) {
    overallAlerts.push({
      type: "low_glucose",
      severity: "critical",
      message:
        "Low blood sugar detected! Consider 15-20g of fast-acting carbs.",
    });
  }

  // Generate tips
  const tips = generateMealTips(mealType, userContext);

  // Calculate total nutrients for top recommendations
  const topPicks = [
    ...mainDishes.slice(0, 1),
    ...proteins.slice(0, 1),
    ...sideDishes.slice(0, 1),
  ];

  const totalNutrients = topPicks.reduce(
    (acc, food) => ({
      calories:
        acc.calories +
        (food.nutrients.calories * food.suggestedPortion.grams) / 100,
      carbs_g: acc.carbs_g + food.suggestedPortion.carbs_g,
      protein_g:
        acc.protein_g +
        (food.nutrients.protein_g * food.suggestedPortion.grams) / 100,
      fat_g:
        acc.fat_g + (food.nutrients.fat_g * food.suggestedPortion.grams) / 100,
      fibre_g:
        acc.fibre_g +
        (food.nutrients.fibre_g * food.suggestedPortion.grams) / 100,
    }),
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0, fibre_g: 0 }
  );

  return {
    mealType,
    timeContext,
    mainDishes,
    sideDishes,
    proteins,
    snacks,
    totalNutrients: {
      calories: Math.round(totalNutrients.calories),
      carbs_g: Math.round(totalNutrients.carbs_g * 10) / 10,
      protein_g: Math.round(totalNutrients.protein_g * 10) / 10,
      fat_g: Math.round(totalNutrients.fat_g * 10) / 10,
      fibre_g: Math.round(totalNutrients.fibre_g * 10) / 10,
    },
    maxCarbsAllowed: maxCarbs,
    alerts: overallAlerts,
    tips,
  };
}

/**
 * Generate helpful tips based on meal type and user context
 */
function generateMealTips(
  mealType: MealType,
  userContext: UserContext
): string[] {
  const tips: string[] = [];
  const profile = userContext.profile;

  // General tips based on meal type
  switch (mealType) {
    case "breakfast":
      tips.push(
        "Include protein with breakfast to maintain stable blood sugar."
      );
      tips.push("Avoid sugary cereals and fruit juices.");
      break;
    case "lunch":
      tips.push("Fill half your plate with non-starchy vegetables.");
      tips.push("Choose whole grains over refined carbohydrates.");
      break;
    case "dinner":
      tips.push("Eat dinner at least 2-3 hours before bedtime.");
      tips.push("Keep portions moderate to support overnight glucose control.");
      break;
    case "snack":
      tips.push("Pair carbs with protein or healthy fats.");
      tips.push("Keep snacks under 15-20g of carbohydrates.");
      break;
  }

  // User-specific tips
  if (profile?.bmi && profile.bmi >= 30) {
    tips.push("Focus on fiber-rich foods to promote fullness.");
  }

  if (profile?.activityLevel === "high") {
    tips.push("Your active lifestyle may allow slightly larger portions.");
  }

  if (userContext.lastGlucose && userContext.lastGlucose > 150) {
    tips.push("Consider checking glucose 2 hours after eating.");
  }

  return tips.slice(0, 3);
}

/**
 * Get food recommendations for a specific category
 */
export function getRecommendedFoodsForCategory(
  foods: Food[],
  rules: RuleTemplate[],
  userContext: UserContext,
  mealType: MealType,
  category: string,
  limit: number = 10
): RecommendedFood[] {
  return foods
    .filter((f) => !f.deleted && f.category === category)
    .map((food) => {
      const baseScore = calculateBaseScore(food, userContext);
      const { scoreAdjustment, alerts, reasons } = applyRules(
        food,
        rules,
        userContext,
        mealType
      );
      const suggestedPortion = getSuggestedPortion(
        food,
        userContext,
        mealType,
        rules
      );

      return {
        ...food,
        score: Math.max(0, Math.min(100, baseScore + scoreAdjustment)),
        reasons,
        alerts,
        suggestedPortion,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search and score foods
 */
export function searchAndScoreFoods(
  foods: Food[],
  rules: RuleTemplate[],
  userContext: UserContext,
  mealType: MealType,
  query: string
): RecommendedFood[] {
  const lowerQuery = query.toLowerCase();

  return foods
    .filter(
      (f) =>
        !f.deleted &&
        (f.localName.toLowerCase().includes(lowerQuery) ||
          f.canonicalName?.toLowerCase().includes(lowerQuery) ||
          f.tags?.some((t) => t.toLowerCase().includes(lowerQuery)))
    )
    .map((food) => {
      const baseScore = calculateBaseScore(food, userContext);
      const { scoreAdjustment, alerts, reasons } = applyRules(
        food,
        rules,
        userContext,
        mealType
      );
      const suggestedPortion = getSuggestedPortion(
        food,
        userContext,
        mealType,
        rules
      );

      return {
        ...food,
        score: Math.max(0, Math.min(100, baseScore + scoreAdjustment)),
        reasons,
        alerts,
        suggestedPortion,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get diabetes-friendly food score label
 */
export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: "Good", color: "#84cc16" };
  if (score >= 40) return { label: "Moderate", color: "#eab308" };
  if (score >= 20) return { label: "Limited", color: "#f97316" };
  return { label: "Avoid", color: "#ef4444" };
}

/**
 * Get GI category
 */
export function getGICategory(gi: number | null): {
  label: string;
  color: string;
} {
  if (gi === null) return { label: "Unknown", color: "#9ca3af" };
  if (gi <= 35) return { label: "Very Low", color: "#22c55e" };
  if (gi <= 55) return { label: "Low", color: "#84cc16" };
  if (gi <= 70) return { label: "Medium", color: "#eab308" };
  return { label: "High", color: "#ef4444" };
}

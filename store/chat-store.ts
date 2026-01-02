import {
  detectIntent,
  fillTemplate,
  getRandomResponse,
  getTimeOfDay,
  greetings,
  negativeFeedback,
} from "@/constants/jsons";
import {
  CachedFood,
  CachedRule,
  getCachedFoods,
  getCachedRules,
  getDatabase,
  getOfflineSession,
  OfflineUserProfile,
} from "@/lib/offline-db";
import { create } from "zustand";

// Types
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    recommendations?: MealRecommendation[];
    warnings?: string[];
    rulesApplied?: RuleResult[];
    safetyCheck?: SafetyCheck;
  };
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecommendation {
  mealName: string;
  foods: Array<{
    name: string;
    localName: string;
    portion: string;
    portionGrams: number;
  }>;
  totalNutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    estimatedGI: number;
  };
  suitabilityScore: number;
  explanation: string;
  warnings: string[];
  preparationTips?: string;
  estimatedCost?: "low" | "medium" | "high";
}

export interface RuleResult {
  rule: string;
  status: "passed" | "warning" | "triggered" | "blocked";
  message?: string;
}

export interface SafetyCheck {
  level: "OK" | "CAUTION" | "URGENT" | "CRITICAL";
  action?: string;
  message?: string;
}

export interface MealAnalysis {
  totalNutrition: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  estimatedGlycemicImpact: {
    glycemicLoad: number;
    expectedGlucoseRise: string;
    peakTime: string;
  };
  suitabilityScore: number;
  verdict: string;
  warnings: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  suggestions: string[];
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  isTyping: boolean;
  streamingText: string;
  isDataSynced: boolean;

  // Data sync check
  checkDataSynced: () => Promise<boolean>;

  // Conversation management
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Message management
  sendMessage: (
    content: string,
    context?: MessageContext
  ) => Promise<ChatMessage | undefined>;
  loadMessages: (conversationId: string) => Promise<void>;

  // AI Recommendation endpoints
  getMealRecommendation: (
    options: MealRecommendationOptions
  ) => Promise<ChatMessage>;
  analyzeMeal: (foods: AnalyzeFoodItem[]) => Promise<MealAnalysis | null>;

  // Offline sync
  syncConversations: () => Promise<void>;
}

interface MessageContext {
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  currentGlucose?: number;
  preferences?: {
    maxCarbs?: number;
    excludeFoods?: string[];
    budget?: "low" | "medium" | "high";
    cookingTime?: "quick" | "medium" | "elaborate";
  };
}

interface MealRecommendationOptions {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  currentGlucose?: number;
  preferences?: {
    maxCarbs?: number;
    excludeFoods?: string[];
    budget?: "low" | "medium" | "high";
    cookingTime?: "quick" | "medium" | "elaborate";
  };
  context?: {
    recentExercise?: boolean;
    fasting?: boolean;
    specialOccasion?: string | null;
  };
}

interface AnalyzeFoodItem {
  foodId: string;
  portionGrams: number;
}

// Database helpers
async function initChatTables() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      message_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

async function saveConversationLocal(conversation: Conversation) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO conversations (id, title, last_message, message_count, created_at, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      conversation.id,
      conversation.title,
      conversation.lastMessage || null,
      conversation.messageCount,
      conversation.createdAt,
      conversation.updatedAt,
    ]
  );
}

async function saveMessageLocal(message: ChatMessage) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO chat_messages (id, conversation_id, role, content, metadata, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      message.id,
      message.conversationId,
      message.role,
      message.content,
      JSON.stringify(message.metadata || {}),
      message.createdAt,
    ]
  );
}

async function getLocalConversations(): Promise<Conversation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    last_message: string | null;
    message_count: number;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM conversations ORDER BY updated_at DESC`);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    lastMessage: row.last_message || undefined,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getLocalMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    metadata: string;
    created_at: string;
  }>(
    `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    [conversationId]
  );

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant" | "system",
    content: row.content,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.created_at,
  }));
}

async function deleteConversationLocal(id: string) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM chat_messages WHERE conversation_id = ?`, [
    id,
  ]);
  await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [id]);
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ OFFLINE RECOMMENDATION ENGINE ============

interface UserContext {
  bmi?: number;
  lastGlucose?: number;
  diabetesType?: string;
  activityLevel?: string;
  incomeBracket?: string;
  allergies?: string[];
}

interface OfflineRecommendationResult {
  recommendations: MealRecommendation[];
  rulesApplied: RuleResult[];
  safetyChecks: {
    level: "OK" | "CAUTION" | "URGENT" | "CRITICAL";
    warnings: string[];
    action?: string;
  };
  generalAdvice?: string;
}

// Evaluate a rule condition against the context
function evaluateCondition(
  condition: string,
  context: Record<string, any>
): boolean {
  if (condition === "default") return true;

  try {
    // Simple expression evaluator for rule conditions
    // Replace context variables with actual values
    let evalStr = condition;

    // Handle common patterns
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, "g");
      if (typeof value === "string") {
        evalStr = evalStr.replace(regex, `"${value}"`);
      } else if (typeof value === "number") {
        evalStr = evalStr.replace(regex, String(value));
      } else if (Array.isArray(value)) {
        evalStr = evalStr.replace(regex, JSON.stringify(value));
      } else if (typeof value === "boolean") {
        evalStr = evalStr.replace(regex, String(value));
      }
    });

    // Handle includes() for arrays
    if (evalStr.includes(".includes(")) {
      const match = evalStr.match(/(\[.*?\])\.includes\(['"](.+?)['"]\)/);
      if (match) {
        const arr = JSON.parse(match[1]);
        const item = match[2];
        return arr.includes(item);
      }
    }

    // Handle simple comparisons
    if (evalStr.includes(">")) {
      const parts = evalStr.split(">");
      const left = parseFloat(parts[0].trim());
      const right = parseFloat(parts[1].trim());
      return left > right;
    }
    if (evalStr.includes("<")) {
      const parts = evalStr.split("<");
      const left = parseFloat(parts[0].trim());
      const right = parseFloat(parts[1].trim());
      return left < right;
    }
    if (evalStr.includes(">=")) {
      const parts = evalStr.split(">=");
      const left = parseFloat(parts[0].trim());
      const right = parseFloat(parts[1].trim());
      return left >= right;
    }
    if (evalStr.includes("<=")) {
      const parts = evalStr.split("<=");
      const left = parseFloat(parts[0].trim());
      const right = parseFloat(parts[1].trim());
      return left <= right;
    }
    if (evalStr.includes("===")) {
      const parts = evalStr.split("===");
      const left = parts[0].trim().replace(/['"]/g, "");
      const right = parts[1].trim().replace(/['"]/g, "");
      return left === right;
    }

    return false;
  } catch {
    return false;
  }
}

// Apply rules to calculate food score and get warnings
function applyRulesToFood(
  food: CachedFood,
  rules: CachedRule[],
  userContext: UserContext,
  mealType: string
): { score: number; warnings: string[]; ruleResults: RuleResult[] } {
  let score = 50; // Base score
  const warnings: string[] = [];
  const ruleResults: RuleResult[] = [];

  // Build context for rule evaluation
  const context: Record<string, any> = {
    "food.gi": food.nutrients.gi || 50,
    "food.protein_g": food.nutrients.protein_g,
    "food.carbs_g": food.nutrients.carbs_g,
    "food.fat_g": food.nutrients.fat_g,
    "food.fibre_g": food.nutrients.fibre_g,
    "food.category": food.category,
    "food.affordability": food.affordability,
    "food.tags": food.tags || [],
    "user.bmi": userContext.bmi || 25,
    "user.lastGlucose": userContext.lastGlucose || 100,
    "user.diabetesType": userContext.diabetesType || "type2",
    "user.activityLevel": userContext.activityLevel || "moderate",
    "user.incomeBracket": userContext.incomeBracket || "middle",
    "meal.timeOfDay": mealType,
  };

  for (const rule of rules) {
    if (!rule.definition?.logic) continue;

    // Check if rule applies to this food category
    const appliesTo = rule.appliesTo || ["all"];
    if (
      !appliesTo.includes("all") &&
      !appliesTo.includes(food.category || "")
    ) {
      continue;
    }

    // Evaluate rule logic
    for (const logic of rule.definition.logic) {
      if (evaluateCondition(logic.when, context)) {
        const result = logic.then;

        // Handle different rule types
        if (rule.type === "scoring") {
          score += result.scoreBonus || 0;
          ruleResults.push({
            rule: rule.slug,
            status: result.scoreBonus > 0 ? "passed" : "warning",
            message: rule.nlTemplate,
          });
        } else if (rule.type === "alert") {
          if (result.severity === "high" || result.severity === "critical") {
            warnings.push(rule.nlTemplate || rule.title);
            score -= 15;
            ruleResults.push({
              rule: rule.slug,
              status: "triggered",
              message: rule.nlTemplate,
            });
          } else if (result.severity === "medium") {
            score -= 5;
            ruleResults.push({
              rule: rule.slug,
              status: "warning",
              message: rule.nlTemplate,
            });
          }
        } else if (rule.type === "constraint") {
          const maxCarbs = result.maxCarbs_g;
          if (maxCarbs && food.nutrients.carbs_g > maxCarbs) {
            score -= 20;
            warnings.push(
              `High carbs: ${food.nutrients.carbs_g}g exceeds recommended ${maxCarbs}g`
            );
            ruleResults.push({
              rule: rule.slug,
              status: "blocked",
              message: rule.nlTemplate,
            });
          }
        }

        break; // Only apply first matching condition
      }
    }
  }

  // Additional scoring based on food properties
  // Favor low GI foods
  if (food.nutrients.gi && food.nutrients.gi < 55) {
    score += 15;
  } else if (food.nutrients.gi && food.nutrients.gi > 70) {
    score -= 10;
  }

  // Favor high fiber foods
  if (food.nutrients.fibre_g > 5) {
    score += 10;
  }

  // Favor high protein foods for blood sugar stability
  if (food.nutrients.protein_g > 15) {
    score += 10;
  }

  // Diabetes-friendly tag bonus
  if (food.tags?.includes("diabetes-friendly")) {
    score += 20;
  }

  return { score: Math.max(0, Math.min(100, score)), warnings, ruleResults };
}

// Generate meal combinations
function generateMealCombinations(
  foods: CachedFood[],
  rules: CachedRule[],
  userContext: UserContext,
  options: MealRecommendationOptions
): MealRecommendation[] {
  const mealType = options.mealType;
  const budget = options.preferences?.budget;
  const excludeFoods = options.preferences?.excludeFoods || [];
  const maxCarbs = options.preferences?.maxCarbs || 45;

  // Filter and score foods
  const scoredFoods = foods
    .filter((food) => {
      // Filter out excluded foods
      if (
        excludeFoods.some((ex) =>
          food.localName.toLowerCase().includes(ex.toLowerCase())
        )
      ) {
        return false;
      }
      // Filter by budget
      if (budget && food.affordability !== budget && budget === "low") {
        if (food.affordability === "high") return false;
      }
      // Filter out deleted
      if (food.deleted) return false;
      // Check for allergies
      if (userContext.allergies?.length) {
        const foodTags = (food.tags || []).join(" ").toLowerCase();
        const foodName = food.localName.toLowerCase();
        for (const allergy of userContext.allergies) {
          if (
            foodTags.includes(allergy.toLowerCase()) ||
            foodName.includes(allergy.toLowerCase())
          ) {
            return false;
          }
        }
      }
      return true;
    })
    .map((food) => ({
      food,
      ...applyRulesToFood(food, rules, userContext, mealType),
    }))
    .sort((a, b) => b.score - a.score);

  // Build meal recommendations
  const recommendations: MealRecommendation[] = [];

  // Category groups for meal building
  const proteins = scoredFoods.filter(
    (f) =>
      f.food.category === "Protein Foods" ||
      (f.food.nutrients.protein_g > 10 && f.food.nutrients.carbs_g < 20)
  );
  const staples = scoredFoods.filter(
    (f) => f.food.category === "Grains & Staples"
  );
  const vegetables = scoredFoods.filter(
    (f) => f.food.category === "Fruits & Vegetables"
  );
  const soups = scoredFoods.filter((f) => f.food.category === "Soups & Stews");
  const snacks = scoredFoods.filter((f) => f.food.category === "Snacks");

  // Build meal combinations based on meal type
  if (mealType === "breakfast") {
    // Breakfast options
    const breakfastFoods = scoredFoods.filter(
      (f) =>
        f.food.tags?.includes("breakfast") ||
        ["oatmeal", "bread", "egg", "akara", "moi moi", "beans"].some((t) =>
          f.food.localName.toLowerCase().includes(t)
        ) ||
        f.food.category === "Protein Foods"
    );

    // Option 1: Protein-focused breakfast
    if (proteins.length > 0) {
      const protein = proteins[0];
      const portion =
        protein.food.portionSizes[1] || protein.food.portionSizes[0];
      recommendations.push(
        createMealRecommendation(
          "Protein-Rich Breakfast",
          [{ food: protein.food, portion }],
          protein.score,
          protein.warnings,
          "A protein-rich breakfast helps maintain stable blood sugar throughout the morning.",
          budget
        )
      );
    }

    // Option 2: Low GI breakfast
    const lowGIFoods = scoredFoods.filter(
      (f) => f.food.nutrients.gi && f.food.nutrients.gi < 55
    );
    if (lowGIFoods.length > 0) {
      const lowGI = lowGIFoods[0];
      const portion = lowGI.food.portionSizes[0]; // Smaller portion for low GI
      recommendations.push(
        createMealRecommendation(
          "Low Glycemic Index Breakfast",
          [{ food: lowGI.food, portion }],
          lowGI.score,
          lowGI.warnings,
          "Low GI foods release energy slowly, preventing blood sugar spikes.",
          budget
        )
      );
    }
  } else if (mealType === "lunch" || mealType === "dinner") {
    // Build balanced meals with protein + staple + vegetables/soup
    const mealName = mealType === "lunch" ? "Lunch" : "Dinner";

    // Option 1: Traditional Nigerian meal
    if (staples.length > 0 && soups.length > 0) {
      const staple = staples[0];
      const soup = soups[0];
      const stapleP = staple.food.portionSizes[0]; // Smaller portion
      const soupP = soup.food.portionSizes[1] || soup.food.portionSizes[0];

      const combinedScore = Math.round((staple.score + soup.score) / 2);
      const combinedWarnings = [...staple.warnings, ...soup.warnings];

      recommendations.push(
        createMealRecommendation(
          `Nigerian ${mealName}`,
          [
            { food: staple.food, portion: stapleP },
            { food: soup.food, portion: soupP },
          ],
          combinedScore,
          combinedWarnings,
          `Traditional meal with controlled portions. ${mealType === "dinner" ? "Lighter portions recommended for evening meals." : ""}`,
          budget
        )
      );
    }

    // Option 2: Protein + Vegetables
    if (proteins.length > 0 && vegetables.length > 0) {
      const protein = proteins[0];
      const veg = vegetables[0];
      const proteinP =
        protein.food.portionSizes[1] || protein.food.portionSizes[0];
      const vegP = veg.food.portionSizes[1] || veg.food.portionSizes[0];

      const combinedScore = Math.round((protein.score + veg.score) / 2);

      recommendations.push(
        createMealRecommendation(
          `Protein & Vegetables ${mealName}`,
          [
            { food: protein.food, portion: proteinP },
            { food: veg.food, portion: vegP },
          ],
          combinedScore,
          protein.warnings,
          "High protein with vegetables provides nutrients without spiking blood sugar.",
          budget
        )
      );
    }

    // Option 3: Rice-based meal with smaller portion
    const riceFoods = staples.filter((f) =>
      f.food.localName.toLowerCase().includes("rice")
    );
    if (riceFoods.length > 0 && proteins.length > 0) {
      const rice = riceFoods[0];
      const protein = proteins[Math.min(1, proteins.length - 1)];
      const riceP = rice.food.portionSizes[0]; // Smallest rice portion
      const proteinP =
        protein.food.portionSizes[1] || protein.food.portionSizes[0];

      recommendations.push(
        createMealRecommendation(
          `Controlled Rice ${mealName}`,
          [
            { food: rice.food, portion: riceP },
            { food: protein.food, portion: proteinP },
          ],
          Math.round((rice.score + protein.score) / 2) - 5,
          [...rice.warnings, "Watch portion size - rice can spike blood sugar"],
          "Smaller rice portions with protein to minimize blood sugar impact.",
          budget
        )
      );
    }
  } else if (mealType === "snack") {
    // Snack options
    const healthySnacks = scoredFoods.filter(
      (f) =>
        f.food.category === "Snacks" ||
        f.food.category === "Fruits & Vegetables" ||
        (f.food.nutrients.carbs_g < 20 && f.food.nutrients.fibre_g > 2)
    );

    for (let i = 0; i < Math.min(3, healthySnacks.length); i++) {
      const snack = healthySnacks[i];
      const portion = snack.food.portionSizes[0]; // Smallest portion for snacks
      recommendations.push(
        createMealRecommendation(
          `Healthy Snack Option ${i + 1}`,
          [{ food: snack.food, portion }],
          snack.score,
          snack.warnings,
          snack.food.nutrients.gi && snack.food.nutrients.gi < 55
            ? "Low GI snack - good for blood sugar control"
            : "Remember to monitor portion sizes",
          budget
        )
      );
    }
  }

  return recommendations.slice(0, 3); // Return top 3 recommendations
}

function createMealRecommendation(
  name: string,
  items: Array<{
    food: CachedFood;
    portion: { name: string; grams: number; carbs_g?: number };
  }>,
  score: number,
  warnings: string[],
  explanation: string,
  budget?: "low" | "medium" | "high"
): MealRecommendation {
  const foods = items.map((item) => ({
    name: item.food.canonicalName || item.food.localName,
    localName: item.food.localName,
    portion: item.portion.name,
    portionGrams: item.portion.grams,
  }));

  const totalNutrition = items.reduce(
    (acc, item) => {
      const multiplier = item.portion.grams / 100;
      return {
        calories:
          acc.calories + Math.round(item.food.nutrients.calories * multiplier),
        carbs: acc.carbs + Math.round(item.food.nutrients.carbs_g * multiplier),
        protein:
          acc.protein + Math.round(item.food.nutrients.protein_g * multiplier),
        fat: acc.fat + Math.round(item.food.nutrients.fat_g * multiplier),
        fiber: acc.fiber + Math.round(item.food.nutrients.fibre_g * multiplier),
        estimatedGI: Math.max(acc.estimatedGI, item.food.nutrients.gi || 50),
      };
    },
    { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, estimatedGI: 0 }
  );

  // Determine cost
  let estimatedCost: "low" | "medium" | "high" = "medium";
  const costs = items.map((i) => i.food.affordability || "medium");
  if (costs.every((c) => c === "low")) estimatedCost = "low";
  if (costs.some((c) => c === "high")) estimatedCost = "high";

  return {
    mealName: name,
    foods,
    totalNutrition,
    suitabilityScore: score,
    explanation,
    warnings: [...new Set(warnings)], // Remove duplicates
    preparationTips: generatePreparationTip(items.map((i) => i.food)),
    estimatedCost,
  };
}

function generatePreparationTip(foods: CachedFood[]): string {
  const tips: string[] = [];

  for (const food of foods) {
    if (food.tags?.includes("fried")) {
      tips.push(
        "Consider grilling or baking instead of frying to reduce fat content"
      );
    }
    if (food.category === "Grains & Staples") {
      tips.push(
        "Allow swallows to cool slightly before eating - this can lower glycemic response"
      );
    }
    if (food.tags?.includes("high-gi")) {
      tips.push("Pair with protein or healthy fats to slow glucose absorption");
    }
  }

  return tips.length > 0
    ? tips[0]
    : "Eat slowly and mindfully for better digestion";
}

// Detect if user is asking about their profile information
function detectProfileQuestion(content: string): {
  isProfileQuestion: boolean;
  type: string;
} {
  const profilePatterns = [
    { pattern: /\b(my|what('?s)?)\s*(height|tall|how tall)/i, type: "height" },
    {
      pattern: /\b(my|what('?s)?)\s*(weight|heavy|how much do i weigh)/i,
      type: "weight",
    },
    { pattern: /\b(my|what('?s)?)\s*(bmi|body mass)/i, type: "bmi" },
    { pattern: /\b(my|what('?s)?)\s*(age|old|how old)/i, type: "age" },
    {
      pattern: /\b(my|what('?s)?)\s*(diabetes\s*type|type of diabetes)/i,
      type: "diabetesType",
    },
    {
      pattern: /\b(my|what('?s)?)\s*(activit|exercise|fitness)/i,
      type: "activityLevel",
    },
    {
      pattern: /\b(my|what('?s)?)\s*(allerg|food\s*allerg)/i,
      type: "allergies",
    },
    {
      pattern: /\b(my|what('?s)?)\s*(profile|information|details|data)/i,
      type: "fullProfile",
    },
    { pattern: /\bwho am i\b/i, type: "fullProfile" },
    { pattern: /\btell me about (my|me)\b/i, type: "fullProfile" },
    {
      pattern: /\b(my|what('?s)?)\s*(income|budget|financial)/i,
      type: "income",
    },
    { pattern: /\b(my|what('?s)?)\s*(sex|gender)/i, type: "sex" },
  ];

  for (const { pattern, type } of profilePatterns) {
    if (pattern.test(content)) {
      return { isProfileQuestion: true, type };
    }
  }

  return { isProfileQuestion: false, type: "" };
}

// Generate response for profile questions
function generateProfileResponse(
  type: string,
  profile: OfflineUserProfile,
  userName: string
): string {
  const greeting = userName ? `${userName}, ` : "";

  switch (type) {
    case "height":
      if (profile.heightCm) {
        const feet = Math.floor(profile.heightCm / 30.48);
        const inches = Math.round((profile.heightCm % 30.48) / 2.54);
        return `${greeting}based on your profile, your height is ${profile.heightCm}cm (approximately ${feet}'${inches}").

This information helps me provide more accurate nutrition recommendations tailored to your body metrics.`;
      }
      return `${greeting}I don't have your height recorded in your profile yet. You can update this in your Profile settings to get more personalized recommendations.`;

    case "weight":
      if (profile.weightKg) {
        return `${greeting}according to your profile, your weight is ${profile.weightKg}kg (approximately ${Math.round(profile.weightKg * 2.205)} lbs).

I use this along with your height to calculate your BMI and provide personalized meal portions.`;
      }
      return `${greeting}I don't have your weight recorded yet. Please update your profile to enable more accurate calorie and portion recommendations.`;

    case "bmi":
      if (profile.bmi) {
        let category = "";
        let advice = "";
        if (profile.bmi < 18.5) {
          category = "underweight";
          advice = "Consider nutrient-dense foods to reach a healthy weight.";
        } else if (profile.bmi < 25) {
          category = "normal weight";
          advice = "Great! Maintain your healthy weight with balanced meals.";
        } else if (profile.bmi < 30) {
          category = "overweight";
          advice =
            "Focus on portion control and lower-GI foods for better blood sugar management.";
        } else {
          category = "in the obese range";
          advice =
            "Weight management can significantly improve diabetes control. Consider consulting your healthcare provider.";
        }
        return `${greeting}your BMI is ${profile.bmi.toFixed(1)}, which is classified as ${category}.

${advice}

Your BMI helps me recommend appropriate portion sizes and calorie targets for your meals.`;
      }
      return `${greeting}I can't calculate your BMI without your height and weight. Please update your profile for personalized health insights.`;

    case "age":
      if (profile.age) {
        return `${greeting}according to your profile, you are ${profile.age} years old.

Your age helps me consider age-appropriate nutrition guidelines and metabolic factors when making recommendations.`;
      }
      return `${greeting}I don't have your age on record. This information helps provide age-appropriate dietary advice.`;

    case "diabetesType":
      if (profile.diabetesType) {
        const typeDescriptions: Record<string, string> = {
          type1:
            "Type 1 diabetes means your body doesn't produce insulin. This requires careful carb counting and insulin management.",
          type2:
            "Type 2 diabetes means your body has insulin resistance. Diet, exercise, and sometimes medication help manage it.",
          prediabetes:
            "Prediabetes indicates elevated blood sugar that's not yet diabetic. Lifestyle changes can often reverse this.",
          unknown:
            "Your diabetes type is not specified. Consider updating this for more tailored advice.",
        };
        return `${greeting}your profile indicates ${profile.diabetesType === "type1" ? "Type 1" : profile.diabetesType === "type2" ? "Type 2" : profile.diabetesType === "prediabetes" ? "Prediabetes" : "Unknown"} diabetes.

${typeDescriptions[profile.diabetesType] || typeDescriptions.unknown}

This information is crucial for my meal recommendations and safety checks.`;
      }
      return `${greeting}your diabetes type isn't specified in your profile. Knowing this helps me provide safer, more accurate recommendations.`;

    case "activityLevel":
      if (profile.activityLevel) {
        const levelDescriptions: Record<string, string> = {
          low: "With a low activity level, I recommend focusing on smaller portions and lower-calorie options.",
          moderate:
            "With moderate activity, you have more flexibility with portions while maintaining balance.",
          high: "With high activity, you may need more calories and carbs to fuel your active lifestyle.",
        };
        return `${greeting}your activity level is set to "${profile.activityLevel}".

${levelDescriptions[profile.activityLevel]}

Regular physical activity helps with blood sugar control and overall health.`;
      }
      return `${greeting}your activity level isn't specified. This helps me recommend appropriate calorie and carb amounts.`;

    case "allergies":
      if (profile.allergies && profile.allergies.length > 0) {
        return `${greeting}your recorded food allergies/intolerances are:

${profile.allergies.map((a) => `• ${a}`).join("\n")}

I automatically exclude these from my meal recommendations to keep you safe.`;
      }
      return `${greeting}you haven't recorded any food allergies or intolerances. If you have any, please add them to your profile for safer recommendations.`;

    case "income":
      if (profile.incomeBracket) {
        const budgetDescriptions: Record<string, string> = {
          low: "I'll prioritize affordable, nutritious options that are budget-friendly.",
          middle: "I'll suggest balanced options with good value for money.",
          high: "I can include premium ingredients and diverse options in recommendations.",
        };
        return `${greeting}your budget preference is set to "${profile.incomeBracket}".

${budgetDescriptions[profile.incomeBracket]}

This helps me recommend meals that fit your budget while maintaining nutritional quality.`;
      }
      return `${greeting}your budget preference isn't set. This helps me recommend meals that fit your financial situation.`;

    case "sex":
      if (profile.sex) {
        return `${greeting}your profile indicates your sex as "${profile.sex}".

This helps me consider gender-specific nutritional needs and metabolic differences in my recommendations.`;
      }
      return `${greeting}your sex isn't specified in your profile. This information helps with more accurate calorie and nutrition recommendations.`;

    case "fullProfile":
      const profileItems: string[] = [];
      if (profile.age) profileItems.push(`• Age: ${profile.age} years`);
      if (profile.sex) profileItems.push(`• Sex: ${profile.sex}`);
      if (profile.heightCm)
        profileItems.push(`• Height: ${profile.heightCm}cm`);
      if (profile.weightKg)
        profileItems.push(`• Weight: ${profile.weightKg}kg`);
      if (profile.bmi) profileItems.push(`• BMI: ${profile.bmi.toFixed(1)}`);
      if (profile.diabetesType)
        profileItems.push(`• Diabetes Type: ${profile.diabetesType}`);
      if (profile.activityLevel)
        profileItems.push(`• Activity Level: ${profile.activityLevel}`);
      if (profile.incomeBracket)
        profileItems.push(`• Budget: ${profile.incomeBracket}`);
      if (profile.allergies?.length)
        profileItems.push(`• Allergies: ${profile.allergies.join(", ")}`);

      if (profileItems.length === 0) {
        return `${greeting}your health profile appears to be incomplete. Please visit your Profile settings to add your information for personalized recommendations.`;
      }

      return `${greeting}here's your health profile summary:

${profileItems.join("\n")}

This information helps me provide personalized meal recommendations tailored to your specific health needs and preferences.`;

    default:
      return `${greeting}I can help you with information about your health profile! Try asking about your:
• Height, weight, or BMI
• Diabetes type
• Activity level
• Food allergies
• Budget preferences`;
  }
}

// Check if question is off-topic (not health/nutrition/diabetes related)
function isOffTopicQuestion(content: string): boolean {
  // Health/nutrition/diabetes related keywords - don't flag these
  const healthKeywords = [
    "food",
    "eat",
    "meal",
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "calorie",
    "carb",
    "protein",
    "fat",
    "fiber",
    "nutrition",
    "diabetes",
    "diabetic",
    "blood sugar",
    "glucose",
    "insulin",
    "gi",
    "glycemic",
    "weight",
    "bmi",
    "health",
    "healthy",
    "diet",
    "recipe",
    "cook",
    "portion",
    "sugar",
    "sweet",
    "exercise",
    "activity",
    "allergy",
    "allergies",
    "nigeria",
    "african",
    "rice",
    "beans",
    "soup",
    "swallow",
    "vegetable",
    "fruit",
    "meat",
    "fish",
    "egg",
    "milk",
    "height",
    "age",
    "profile",
    "my",
    "recommend",
    "suggest",
    "safe",
    "can i",
    "should i",
    "is it",
    "what about",
    "low",
    "high",
    "moderate",
    "good",
    "bad",
    "best",
    "morning",
    "afternoon",
    "evening",
    "night",
    "fasting",
    "medication",
    "medicine",
    "doctor",
    "hospital",
    "symptom",
    "tip",
    "advice",
    "help",
    "guide",
    "manage",
    "control",
  ];

  // Check if any health keyword is present
  const hasHealthKeyword = healthKeywords.some((keyword) =>
    content.includes(keyword)
  );

  if (hasHealthKeyword) {
    return false; // Not off-topic
  }

  // Off-topic patterns
  const offTopicPatterns = [
    /\b(weather|temperature|rain|sunny|cold|hot)\b/i,
    /\b(news|politics|election|government|president|minister)\b/i,
    /\b(football|soccer|basketball|sports|match|game|score)\b/i,
    /\b(movie|film|music|song|singer|actor|celebrity)\b/i,
    /\b(code|program|javascript|python|software|app|website)\b/i,
    /\b(math|calculate|solve|equation|number)\b/i,
    /\b(history|geography|capital|country|population)\b/i,
    /\b(joke|funny|story|poem|write|essay)\b/i,
    /\b(translate|language|french|spanish|yoruba meaning)\b/i,
    /\b(stock|crypto|bitcoin|investment|money|bank)\b/i,
    /\b(love|relationship|dating|marriage|boyfriend|girlfriend)\b/i,
    /\b(travel|flight|hotel|vacation|holiday)\b/i,
    /\b(phone|laptop|computer|iphone|samsung|device)\b/i,
    /\b(who (is|was)|when (did|was)|where (is|was))\b/i,
    /\b(define|meaning of|what does .* mean)\b/i,
  ];

  return offTopicPatterns.some((pattern) => pattern.test(content));
}

// Generate professional response for off-topic questions
function generateOffTopicResponse(userName: string): string {
  const greeting = userName ? `${userName}, t` : "T";

  return `${greeting}hank you for your question! 🙏

I'm Gluvia, an AI assistant specifically designed for diabetes nutrition management. I'm trained to help with:

🍽️ Personalized meal recommendations
🥗 Nigerian food nutrition information
📊 Blood sugar management tips
⚖️ Diet planning for diabetes
🏃 Activity and lifestyle advice for diabetics

I'm not trained to answer questions outside of health and nutrition topics. For other questions, you might want to try a general-purpose assistant.

Is there anything related to your diet, meals, or diabetes management I can help you with today?`;
}

// Main offline recommendation function
async function generateOfflineRecommendation(
  options: MealRecommendationOptions
): Promise<OfflineRecommendationResult> {
  // Get cached foods and rules
  const foods = await getCachedFoods();
  const rules = await getCachedRules();

  if (foods.length === 0) {
    throw new Error("No cached foods available. Please sync food data first.");
  }

  // Get user context from offline session
  let userContext: UserContext = {};
  try {
    const session = await getOfflineSession();
    if (session?.user.profile) {
      const profile = session.user.profile as OfflineUserProfile;
      userContext = {
        bmi: profile.bmi,
        diabetesType: profile.diabetesType,
        activityLevel: profile.activityLevel,
        incomeBracket: profile.incomeBracket,
        allergies: profile.allergies,
      };
    }
  } catch {
    // Use defaults if no session
  }

  // Add current glucose from options
  if (options.currentGlucose) {
    userContext.lastGlucose = options.currentGlucose;
  }

  // Generate meal recommendations
  const recommendations = generateMealCombinations(
    foods,
    rules,
    userContext,
    options
  );

  // Collect all rule results
  const allRuleResults: RuleResult[] = [];
  const allWarnings: string[] = [];

  recommendations.forEach((rec) => {
    allWarnings.push(...rec.warnings);
  });

  // Safety check based on glucose
  let safetyLevel: "OK" | "CAUTION" | "URGENT" | "CRITICAL" = "OK";
  let safetyAction: string | undefined;

  if (options.currentGlucose) {
    if (options.currentGlucose < 70) {
      safetyLevel = "CRITICAL";
      safetyAction =
        "Your blood sugar is very low. Please consume 15-20g of fast-acting carbs immediately and recheck in 15 minutes.";
      allWarnings.unshift("⚠️ LOW BLOOD SUGAR DETECTED");
    } else if (options.currentGlucose > 180) {
      safetyLevel = "CAUTION";
      allWarnings.unshift(
        "Blood sugar is elevated - choose lower carb options"
      );
    } else if (options.currentGlucose > 250) {
      safetyLevel = "URGENT";
      allWarnings.unshift(
        "Blood sugar is very high - consider consulting your healthcare provider"
      );
    }
  }

  return {
    recommendations,
    rulesApplied: allRuleResults,
    safetyChecks: {
      level: safetyLevel,
      warnings: [...new Set(allWarnings)],
      action: safetyAction,
    },
    generalAdvice:
      "These recommendations are based on your profile and Nigerian food database. Always monitor your blood sugar and consult your healthcare provider for personalized advice.",
  };
}

// Generate intelligent offline response based on user message
async function generateOfflineResponse(content: string): Promise<string> {
  const lowerContent = content.toLowerCase().trim();

  // Get cached foods for context
  const foods = await getCachedFoods();
  const rules = await getCachedRules();

  // Get user profile for personalized responses
  let userProfile: OfflineUserProfile | null = null;
  let userName = "";
  try {
    const session = await getOfflineSession();
    if (session?.user) {
      userProfile = session.user.profile || null;
      userName = session.user.name?.split(" ")[0] || "";
    }
  } catch {
    // Continue without profile
  }

  // Helper to personalize message with user name
  const personalize = (message: string) => {
    return fillTemplate(message, {
      name: userName ? `, ${userName}` : "",
      foodCount: foods.length.toString(),
      ruleCount: rules.length.toString(),
    });
  };

  // Use the detectIntent helper from JSON utilities
  const intent = detectIntent(lowerContent);

  // Handle taunting questions first (mad?, are you mad?, etc.) - SHORT responses
  if (intent.isNegativeTaunting) {
    const responses = negativeFeedback.responses.taunting;
    const response = getRandomResponse(responses);
    return personalize(response.message);
  }

  // Handle other negative feedback
  if (intent.isNegativeSevere) {
    const responses = negativeFeedback.responses.severe;
    const response = getRandomResponse(responses);
    return personalize(response.message);
  }
  if (intent.isNegativeModerate) {
    const responses = negativeFeedback.responses.moderate;
    const response = getRandomResponse(responses);
    return personalize(response.message);
  }
  if (intent.isNegativeFrustration) {
    const responses = negativeFeedback.responses.frustration;
    const response = getRandomResponse(responses);
    return personalize(response.message);
  }
  if (intent.isNegativeMild) {
    const responses = negativeFeedback.responses.mild;
    const response = getRandomResponse(responses);
    return personalize(response.message);
  }

  // Handle personal profile questions
  const profileQuestions = detectProfileQuestion(lowerContent);
  if (profileQuestions.isProfileQuestion && userProfile) {
    return generateProfileResponse(
      profileQuestions.type,
      userProfile,
      userName
    );
  }

  // Check if question is off-topic (not related to health/diabetes/nutrition)
  if (isOffTopicQuestion(lowerContent)) {
    return generateOffTopicResponse(userName);
  }

  // Handle greetings with time-awareness
  if (intent.isGreeting) {
    const timeOfDay = getTimeOfDay();
    const timeGreetings = greetings.greetings.timeAware[timeOfDay].responses;
    const greeting = getRandomResponse(timeGreetings);
    return personalize(greeting);
  }

  // Handle "how are you"
  if (intent.isHowAreYou) {
    const response = getRandomResponse(greetings.howAreYou.responses);
    return personalize(response);
  }

  // Handle "who are you"
  if (intent.isWhoAreYou) {
    const response = getRandomResponse(greetings.whoAreYou.responses);
    return personalize(response);
  }

  // Handle thanks
  if (intent.isThanks) {
    const response = getRandomResponse(
      greetings.thanks.intensityLevels.moderate.responses
    );
    return personalize(response);
  }

  // Handle goodbye with time-awareness
  if (intent.isGoodbye) {
    const timeOfDay = getTimeOfDay();
    const goodbyeResponses = greetings.goodbye.timeAware[timeOfDay].responses;
    const response = getRandomResponse(goodbyeResponses);
    return personalize(response);
  }

  // Handle help requests
  if (intent.isHelp) {
    const response = getRandomResponse(greetings.help.responses);
    return personalize(response);
  }

  // Handle positive reactions
  if (intent.isPositiveReaction) {
    const response = getRandomResponse(greetings.positiveReaction.responses);
    return personalize(response);
  }

  // Handle acknowledgments (ok, sure, etc.)
  if (intent.isAcknowledgment) {
    const response = getRandomResponse(greetings.acknowledgment.responses);
    return personalize(response);
  }

  // Handle meal recommendation requests - ASK for meal type if not specified
  if (
    lowerContent.includes("recommend") ||
    lowerContent.includes("suggestion") ||
    lowerContent.includes("suggest") ||
    lowerContent.includes("what should i eat") ||
    lowerContent.includes("what can i eat") ||
    lowerContent.includes("give me food") ||
    lowerContent.includes("i want to eat") ||
    lowerContent.includes("i'm hungry") ||
    lowerContent.includes("im hungry") ||
    lowerContent.includes("hungry")
  ) {
    // Check if specific meal type is mentioned
    const hasBreakfast =
      lowerContent.includes("breakfast") || lowerContent.includes("morning");
    const hasLunch =
      lowerContent.includes("lunch") || lowerContent.includes("afternoon");
    const hasDinner =
      lowerContent.includes("dinner") ||
      lowerContent.includes("evening") ||
      lowerContent.includes("night");
    const hasSnack = lowerContent.includes("snack");

    // If no specific meal type mentioned, ask user
    if (!hasBreakfast && !hasLunch && !hasDinner && !hasSnack) {
      return personalize(
        `Great${userName ? `, ${userName}` : ""}! I'd love to help you find the perfect meal! 🍽️\n\n**When is this meal for?**\n\n☀️ **Breakfast** - Start your day right\n🌤️ **Lunch** - Midday energy\n🌙 **Dinner** - Evening meal\n🍎 **Snack** - Between meals\n\nJust tell me which one, and I'll give you personalized diabetes-friendly recommendations!`
      );
    }
  }

  // Check for low-GI food questions
  if (
    lowerContent.includes("low-gi") ||
    lowerContent.includes("low gi") ||
    lowerContent.includes("glycemic")
  ) {
    const lowGIFoods = foods
      .filter((f) => f.nutrients.gi && f.nutrients.gi < 55)
      .slice(0, 8);

    if (lowGIFoods.length > 0) {
      const foodList = lowGIFoods
        .map((f) => `• ${f.localName} (GI: ${f.nutrients.gi})`)
        .join("\n");
      return personalize(
        `Great question${userName ? `, ${userName}` : ""}! 💚 Here are excellent low-GI Nigerian foods:\n\n${foodList}\n\nThese release glucose slowly, helping maintain stable blood sugar levels. Include them in your daily meals!`
      );
    }
  }

  // Check for blood sugar tips
  if (
    lowerContent.includes("blood sugar") ||
    lowerContent.includes("glucose") ||
    lowerContent.includes("sugar level")
  ) {
    return personalize(
      `Here are practical tips for managing blood sugar${userName ? `, ${userName}` : ""}:\n\n1. **Eat regular meals** - Don't skip, especially breakfast\n2. **Choose whole grains** - Brown rice, ofada rice over refined options\n3. **Add protein** - Fish, beans, eggs slow glucose absorption\n4. **Fiber is key** - Vegetables, okra, beans help stabilize blood sugar\n5. **Watch portions** - Even healthy foods can spike sugar in large amounts\n6. **Stay active** - A 30-minute walk after meals helps\n7. **Stay hydrated** - Drink plenty of water\n\nTap 🍽️ for personalized meal suggestions!`
    );
  }

  // Check for Nigerian food queries
  if (
    lowerContent.includes("nigerian") ||
    lowerContent.includes("food") ||
    lowerContent.includes("what can i eat")
  ) {
    const categories = [...new Set(foods.map((f) => f.category))];
    const categoryList = categories.slice(0, 6).join(", ");
    return personalize(
      `I have ${foods.length}+ Nigerian foods across categories like ${categoryList}${userName ? `, ${userName}` : ""}.\n\nTap 🍽️ for personalized meal recommendations based on your profile!\n\nI consider your diabetes type, blood sugar levels, budget, and activity level.`
    );
  }

  // Check for specific food questions
  if (
    lowerContent.includes("can i eat") ||
    lowerContent.includes("is it safe") ||
    lowerContent.includes("should i eat")
  ) {
    // Try to find the food mentioned
    const foundFood = foods.find(
      (f) =>
        lowerContent.includes(f.localName.toLowerCase()) ||
        (f.canonicalName &&
          lowerContent.includes(f.canonicalName.toLowerCase()))
    );

    if (foundFood) {
      const gi = foundFood.nutrients.gi;
      const giCategory =
        gi && gi < 55
          ? "low GI ✅"
          : gi && gi < 70
            ? "medium GI ⚠️"
            : "high GI ⚠️";
      return personalize(
        `**${foundFood.localName}**\n\n📊 Nutrition per 100g:\n• Calories: ${foundFood.nutrients.calories} kcal\n• Carbs: ${foundFood.nutrients.carbs_g}g\n• Protein: ${foundFood.nutrients.protein_g}g\n• Fat: ${foundFood.nutrients.fat_g}g\n• Fiber: ${foundFood.nutrients.fibre_g}g\n• GI: ${gi || "N/A"} (${gi ? giCategory : "unknown"})\n\n${gi && gi > 55 ? "💡 Consider smaller portions and pair with protein or vegetables to reduce blood sugar impact." : "✅ This is a diabetes-friendly option when eaten in appropriate portions."}`
      );
    }
  }

  // Check for diabetes management questions
  if (lowerContent.includes("diabetes") || lowerContent.includes("diabetic")) {
    return personalize(
      `Living well with diabetes is absolutely possible${userName ? `, ${userName}` : ""}! 💪\n\n🍽️ **Meal Recommendations** - Tap the meal button for personalized suggestions\n\n📊 **Food Database** - ${foods.length}+ Nigerian foods with full nutrition data\n\n⚖️ **Dietary Rules** - ${rules.length} rules ensure safe recommendations\n\nWhat would you like help with today?`
    );
  }

  // Smarter default response - much shorter and more helpful
  return personalize(
    `Hey${userName ? ` ${userName}` : ""}! 👋 I'm Gluvia, your diabetes nutrition assistant.\n\nI can help with:\n• 🍽️ Meal recommendations (tap the button below)\n• 📊 Food nutrition info\n• 💡 Blood sugar management tips\n\nTry asking: "What are low-GI foods?" or "Suggest breakfast"`
  );
}

// Helper to generate smart chat title from first message
function generateChatTitle(content: string): string {
  const lowerContent = content.toLowerCase();

  // Meal recommendation queries
  if (lowerContent.includes("breakfast")) return "Breakfast Recommendations";
  if (lowerContent.includes("lunch")) return "Lunch Recommendations";
  if (lowerContent.includes("dinner")) return "Dinner Recommendations";
  if (lowerContent.includes("snack")) return "Snack Ideas";
  if (lowerContent.includes("meal") || lowerContent.includes("eat"))
    return "Meal Planning";

  // Topic-based titles
  if (
    lowerContent.includes("low-gi") ||
    lowerContent.includes("low gi") ||
    lowerContent.includes("glycemic")
  )
    return "Low-GI Foods Guide";
  if (lowerContent.includes("blood sugar") || lowerContent.includes("glucose"))
    return "Blood Sugar Tips";
  if (lowerContent.includes("diabetes") || lowerContent.includes("diabetic"))
    return "Diabetes Management";
  if (lowerContent.includes("calorie") || lowerContent.includes("weight"))
    return "Calorie & Weight";
  if (lowerContent.includes("protein")) return "Protein Guide";
  if (lowerContent.includes("carb")) return "Carb Management";

  // Food-specific
  if (lowerContent.includes("rice")) return "Rice & Grains";
  if (lowerContent.includes("soup")) return "Nigerian Soups";
  if (lowerContent.includes("swallow")) return "Swallow Options";

  // Extract first few meaningful words
  const words = content.split(/\s+/).slice(0, 4).join(" ");
  if (words.length > 3)
    return words.length > 25 ? words.substring(0, 25) + "..." : words;

  // Fallback with formatted date
  return "New Chat";
}

// Store
export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isTyping: false,
  streamingText: "",
  isDataSynced: false,

  checkDataSynced: async () => {
    try {
      const foods = await getCachedFoods();
      const rules = await getCachedRules();
      const synced = foods.length > 0 && rules.length > 0;
      set({ isDataSynced: synced });
      return synced;
    } catch {
      set({ isDataSynced: false });
      return false;
    }
  },

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      await initChatTables();
      // FULLY OFFLINE - Load from local DB only
      const localConversations = await getLocalConversations();
      set({ conversations: localConversations, isLoading: false });
    } catch (error) {
      console.error("Error loading conversations:", error);
      set({ isLoading: false });
    }
  },

  createConversation: async (title?: string) => {
    const newConversation: Conversation = {
      id: generateId(),
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // FULLY OFFLINE - Save locally only
      await saveConversationLocal(newConversation);

      set((state) => ({
        conversations: [newConversation, ...state.conversations],
        currentConversation: newConversation,
        messages: [],
      }));

      return newConversation;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  },

  selectConversation: async (id: string) => {
    const conversation = get().conversations.find((c) => c.id === id);
    if (conversation) {
      set({ currentConversation: conversation });
      await get().loadMessages(id);
    }
  },

  deleteConversation: async (id: string) => {
    try {
      // FULLY OFFLINE - Delete locally only
      await deleteConversationLocal(id);

      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversation:
          state.currentConversation?.id === id
            ? null
            : state.currentConversation,
        messages: state.currentConversation?.id === id ? [] : state.messages,
      }));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoading: true });
    try {
      // FULLY OFFLINE - Load from local DB only
      const localMessages = await getLocalMessages(conversationId);
      set({ messages: localMessages, isLoading: false });
    } catch (error) {
      console.error("Error loading messages:", error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string, context?: MessageContext) => {
    const { currentConversation, messages } = get();

    if (!currentConversation) {
      // Create new conversation if none exists
      await get().createConversation();
    }

    const conversation = get().currentConversation!;
    set({ isSending: true });

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      conversationId: conversation.id,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // Add user message immediately
    set((state) => ({
      messages: [...state.messages, userMessage],
    }));

    // Save user message locally
    await saveMessageLocal(userMessage);

    // FULLY OFFLINE - Generate intelligent response locally
    try {
      // Small delay to simulate thinking
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate offline response based on message content
      const responseContent = await generateOfflineResponse(content);

      const assistantMessage: ChatMessage = {
        id: generateId(),
        conversationId: conversation.id,
        role: "assistant",
        content: responseContent,
        createdAt: new Date().toISOString(),
      };

      // Save assistant message locally
      await saveMessageLocal(assistantMessage);

      // Update conversation with smart title if it's the first message
      const isFirstMessage = messages.length === 0;
      const smartTitle = isFirstMessage
        ? generateChatTitle(content)
        : conversation.title;

      const updatedConversation = {
        ...conversation,
        title: smartTitle,
        lastMessage: assistantMessage.content.substring(0, 100),
        messageCount: messages.length + 2,
        updatedAt: new Date().toISOString(),
      };
      await saveConversationLocal(updatedConversation);

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        currentConversation: updatedConversation,
        conversations: state.conversations.map((c) =>
          c.id === conversation.id ? updatedConversation : c
        ),
        isSending: false,
      }));

      // Return the assistant message for streaming
      return assistantMessage;
    } catch (error: any) {
      console.error("Error generating response:", error);

      const errorMessage: ChatMessage = {
        id: generateId(),
        conversationId: conversation.id,
        role: "assistant",
        content:
          "I apologize, but I couldn't process your request. Please try asking about meal recommendations using the meal button, or ask about Nigerian foods and diabetes management.",
        createdAt: new Date().toISOString(),
      };

      await saveMessageLocal(errorMessage);

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isSending: false,
      }));

      return errorMessage;
    }
  },

  getMealRecommendation: async (options: MealRecommendationOptions) => {
    const { currentConversation } = get();

    if (!currentConversation) {
      await get().createConversation("Meal Recommendations");
    }

    const conversation = get().currentConversation!;
    set({ isSending: true });

    // Create user request message
    const userMessage: ChatMessage = {
      id: generateId(),
      conversationId: conversation.id,
      role: "user",
      content: `What should I eat for ${options.mealType}?${
        options.currentGlucose
          ? ` My current glucose is ${options.currentGlucose} mg/dL.`
          : ""
      }${
        options.preferences?.budget
          ? ` Budget: ${options.preferences.budget}.`
          : ""
      }`,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
    }));

    await saveMessageLocal(userMessage);

    // FULLY OFFLINE RECOMMENDATION ENGINE - No API calls
    try {
      const offlineData = await generateOfflineRecommendation(options);

      const assistantMessage: ChatMessage = {
        id: generateId(),
        conversationId: conversation.id,
        role: "assistant",
        content: formatRecommendationResponse(offlineData),
        metadata: {
          recommendations: offlineData.recommendations,
          warnings: offlineData.safetyChecks?.warnings || [],
          rulesApplied: offlineData.rulesApplied,
          safetyCheck: offlineData.safetyChecks,
        },
        createdAt: new Date().toISOString(),
      };

      await saveMessageLocal(assistantMessage);

      // Update conversation
      const updatedConversation = {
        ...conversation,
        lastMessage: assistantMessage.content.substring(0, 100),
        messageCount: get().messages.length + 2,
        updatedAt: new Date().toISOString(),
      };
      await saveConversationLocal(updatedConversation);

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        currentConversation: updatedConversation,
        conversations: state.conversations.map((c) =>
          c.id === conversation.id ? updatedConversation : c
        ),
        isSending: false,
      }));

      return assistantMessage;
    } catch (offlineError: any) {
      console.error("Offline recommendation error:", offlineError);

      const errorMessage: ChatMessage = {
        id: generateId(),
        conversationId: conversation.id,
        role: "assistant",
        content:
          "I need food and nutrition data to help you. Please tap 'Sync Data' to download the required data for offline use. This only needs to be done once!",
        createdAt: new Date().toISOString(),
      };

      await saveMessageLocal(errorMessage);

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isSending: false,
      }));

      return errorMessage;
    }
  },

  analyzeMeal: async (foods: AnalyzeFoodItem[]) => {
    try {
      // FULLY OFFLINE - Calculate nutrition from cached foods
      const cachedFoods = await getCachedFoods();

      let totalCalories = 0;
      let totalCarbs = 0;
      let totalProtein = 0;
      let totalFat = 0;
      let totalFiber = 0;
      let maxGI = 0;
      const warnings: Array<{
        type: string;
        message: string;
        severity: string;
      }> = [];

      for (const item of foods) {
        const found = cachedFoods.find(
          (f) =>
            f.id === item.foodId ||
            f.localName.toLowerCase().includes(item.foodId.toLowerCase()) ||
            (f.canonicalName &&
              f.canonicalName.toLowerCase().includes(item.foodId.toLowerCase()))
        );

        if (found) {
          const multiplier = item.portionGrams / 100;
          totalCalories += found.nutrients.calories * multiplier;
          totalCarbs += found.nutrients.carbs_g * multiplier;
          totalProtein += found.nutrients.protein_g * multiplier;
          totalFat += found.nutrients.fat_g * multiplier;
          totalFiber += found.nutrients.fibre_g * multiplier;
          if (found.nutrients.gi) maxGI = Math.max(maxGI, found.nutrients.gi);

          if (found.nutrients.gi && found.nutrients.gi > 70) {
            warnings.push({
              type: "high-gi",
              message: `${found.localName} has a high glycemic index`,
              severity: "warning",
            });
          }
        }
      }

      const analysis: MealAnalysis = {
        totalNutrition: {
          calories: Math.round(totalCalories),
          carbs: Math.round(totalCarbs),
          protein: Math.round(totalProtein),
          fat: Math.round(totalFat),
          fiber: Math.round(totalFiber),
        },
        estimatedGlycemicImpact: {
          glycemicLoad: Math.round((totalCarbs * maxGI) / 100),
          expectedGlucoseRise:
            maxGI > 70 ? "High" : maxGI > 55 ? "Moderate" : "Low",
          peakTime: "30-60 minutes",
        },
        suitabilityScore: maxGI < 55 ? 85 : maxGI < 70 ? 65 : 45,
        verdict:
          maxGI < 55
            ? "Good choice for diabetes"
            : "Consider lower GI alternatives",
        warnings,
        suggestions: totalFiber < 5 ? ["Add more fiber-rich vegetables"] : [],
      };

      return analysis;
    } catch (error) {
      console.error("Error analyzing meal:", error);
      return null;
    }
  },

  syncConversations: async () => {
    // FULLY OFFLINE - No server sync needed
    // All conversations are stored locally in SQLite
    // This function is kept for API compatibility but does nothing
    console.log("Offline mode: Conversations are stored locally");
  },
}));

// Helper function to format recommendations into readable text
function formatRecommendationResponse(data: any): string {
  if (!data?.recommendations?.length) {
    return "I couldn't generate recommendations at this time. Please try again.";
  }

  let response = "Here are my personalized meal recommendations for you:\n\n";

  data.recommendations.forEach((rec: MealRecommendation, index: number) => {
    response += `${index + 1}. ${rec.mealName}\n`;
    response += `   Score: ${rec.suitabilityScore}/100\n`;
    response += `   ${rec.explanation}\n\n`;

    response += "   Foods:\n";
    rec.foods.forEach((food) => {
      response += `   • ${food.localName} - ${food.portion}\n`;
    });

    response += `\n   Nutrition: ${rec.totalNutrition.calories} cal | ${rec.totalNutrition.carbs}g carbs | ${rec.totalNutrition.protein}g protein\n`;

    if (rec.warnings?.length) {
      rec.warnings.forEach((warning) => {
        response += `\n   ⚠️ ${warning}\n`;
      });
    }

    if (rec.preparationTips) {
      response += `\n   💡 Tip: ${rec.preparationTips}\n`;
    }

    if (index < data.recommendations.length - 1) {
      response += "\n───────────────────\n\n";
    }
  });

  if (data.generalAdvice) {
    response += `\n\n📋 ${data.generalAdvice}`;
  }

  return response;
}

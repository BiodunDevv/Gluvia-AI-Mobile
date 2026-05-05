import { T, useTranslation } from "@/hooks/use-translation";
import { AppLoader } from "@/components/ui";
import { FoodDetailModal } from "@/components/modals";
import { useChatStore, type ChatMessage } from "@/store/chat-store";
import { useFoodStore, type Food } from "@/store/food-store";
import { useSyncStore } from "@/store/sync-store";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  Send,
  User,
  WifiOff,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Google CSE image fetch ───────────────────────────────────────────────────

const GOOGLE_CSE_API_KEY = "AIzaSyAczXPf8HqWsxRbJrmLbOdoludNz2MRAHw";
const GOOGLE_CSE_ENGINE_ID = "03eaddfad6760446e";

const imageCache = new Map<string, string | null>();

async function fetchFoodImageFromGoogle(foodName: string): Promise<string | null> {
  const cacheKey = foodName.toLowerCase().trim();
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey) ?? null;

  try {
    const query = encodeURIComponent(`${foodName} food`);
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}` +
      `&cx=${GOOGLE_CSE_ENGINE_ID}&q=${query}&searchType=image&num=1&safe=active`;

    const res = await fetch(url);
    if (!res.ok) { imageCache.set(cacheKey, null); return null; }
    const json = await res.json();
    const imageUrl: string | null = json?.items?.[0]?.link ?? null;
    imageCache.set(cacheKey, imageUrl);
    return imageUrl;
  } catch {
    imageCache.set(cacheKey, null);
    return null;
  }
}

// ─── Food name extraction from AI response ────────────────────────────────────

// Non-food words that often appear bolded or in lists but are not foods
const NON_FOOD_WORDS = new Set([
  "note", "tip", "important", "reminder", "warning", "summary", "conclusion",
  "result", "answer", "option", "step", "reason", "benefit", "effect",
  "glucose", "insulin", "blood", "sugar", "carb", "calorie", "protein",
  "fat", "fiber", "fibre", "vitamin", "mineral", "glycemic", "index",
  "diabetes", "diabetic", "health", "body", "weight", "monitor",
  "morning", "evening", "afternoon", "night", "daily", "weekly",
]);

function isFoodCandidate(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (lower.length < 3 || lower.length > 35) return false;
  if (NON_FOOD_WORDS.has(lower)) return false;
  // Must contain at least one vowel (real words)
  if (!/[aeiou]/i.test(lower)) return false;
  // Reject if mostly numbers
  if (/^\d/.test(lower)) return false;
  return true;
}

function extractFoodMentions(content: string): string[] {
  const text = content.toLowerCase();

  // Only show food cards when the message is specifically about food/meal recommendations
  // NOT for glucose trend, general health questions, etc.
  const isFoodRecommendation =
    /\b(recommend|suggest|try eating|good food|best food|eat more|include|add to (your )?diet|low.?gi food|diabetic.?friendly food|meal (idea|plan|option)|food (for|to|that)|breakfast|lunch|dinner|snack)\b/.test(text);

  const hasActualFoodList =
    /^[-•*\d]\d*[.)]\s+[A-Z]/m.test(content); // starts with list marker + capital

  if (!isFoodRecommendation && !hasActualFoodList) return [];

  const names: string[] = [];

  // Numbered/bulleted list items: "1. Brown rice" or "- Oats"
  const listItemRegex = /^(?:\d+[.)]\s+|[-•*]\s+)\*{0,2}([A-Z][A-Za-z\s\-\/]{2,34})\*{0,2}/gm;
  let m: RegExpExecArray | null;
  while ((m = listItemRegex.exec(content)) !== null) {
    const candidate = m[1].replace(/\(.*?\)/g, "").trim();
    if (isFoodCandidate(candidate)) names.push(candidate);
  }

  // Bold **Food Name** pattern only if no list found
  if (!names.length) {
    const boldRegex = /\*\*([A-Z][A-Za-z\s\-\/]{2,30})\*\*/g;
    while ((m = boldRegex.exec(content)) !== null) {
      const candidate = m[1].replace(/\(.*?\)/g, "").trim();
      if (isFoodCandidate(candidate)) names.push(candidate);
    }
  }

  // Deduplicate (case-insensitive), limit to 5
  const seen = new Set<string>();
  return names
    .filter((n) => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 5);
}

// ─── Auto-create unknown food via backend AI ──────────────────────────────────

async function autoCreateFood(name: string): Promise<Food | null> {
  try {
    const api = (await import("@/lib/api")).default;
    const res = await api.post("/foods/ai-generate", { name });
    const food = res.data?.data;
    if (!food) return null;
    return {
      _id: food._id || food.id,
      localName: food.localName,
      canonicalName: food.canonicalName,
      category: food.category,
      nutrients: food.nutrients,
      portionSizes: food.portionSizes || [],
      affordability: food.affordability,
      tags: food.tags || [],
      imageUrl: food.imageUrl,
      version: food.version || 1,
      deleted: false,
      createdAt: food.createdAt || new Date().toISOString(),
      updatedAt: food.updatedAt || new Date().toISOString(),
    } as Food;
  } catch {
    return null;
  }
}

// ─── Food card component ──────────────────────────────────────────────────────

function FoodCard({
  name,
  food,
  onPress,
}: {
  name: string;
  food: Food | null;
  onPress: () => void;
}) {
  const [remoteImage, setRemoteImage] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const imageUrl = food?.imageUrl || remoteImage;

  useEffect(() => {
    if (food?.imageUrl) return;
    setImgLoading(true);
    fetchFoodImageFromGoogle(food?.localName || name).then((url) => {
      setRemoteImage(url);
      setImgLoading(false);
    });
  }, [food, name]);

  const calories = food?.nutrients?.calories;
  const carbs = food?.nutrients?.carbs_g;
  const gi = food?.nutrients?.gi;

  const giColor =
    gi == null ? "#9ca3af" : gi <= 55 ? "#10b981" : gi <= 69 ? "#f59e0b" : "#ef4444";
  const giLabel = gi == null ? "GI N/A" : gi <= 55 ? "Low GI" : gi <= 69 ? "Mid GI" : "High GI";

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={{
        width: 130,
        height: 170,
        borderRadius: 14,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        overflow: "hidden",
        marginRight: 10,
      }}
    >
      {/* Image — fixed height */}
      <View style={{ width: "100%", height: 80, backgroundColor: "#f3f4f6" }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : imgLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <AppLoader size="sm" color="#9ca3af" />
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 26 }}>🍽️</Text>
          </View>
        )}
        {/* GI badge */}
        <View style={{
          position: "absolute", top: 5, right: 5,
          borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
          backgroundColor: giColor + "22", borderWidth: 1, borderColor: giColor + "55",
        }}>
          <Text style={{ fontSize: 8, fontWeight: "700", color: giColor }}>{giLabel}</Text>
        </View>
      </View>

      {/* Info — fixed height remainder */}
      <View style={{ flex: 1, padding: 8, justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#111827" }} numberOfLines={2}>
          {food?.localName || name}
        </Text>
        <View>
          {(calories != null || carbs != null) && (
            <Text style={{ fontSize: 10, color: "#6b7280" }} numberOfLines={1}>
              {[calories != null && `${Math.round(calories)} kcal`, carbs != null && `${Math.round(carbs)}g carbs`].filter(Boolean).join(" · ")}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 2 }}>
            <Text style={{ fontSize: 10, color: "#1447e6", fontWeight: "600" }}>Details</Text>
            <ChevronRight size={9} color="#1447e6" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Food cards strip ─────────────────────────────────────────────────────────

function FoodCardsStrip({
  content,
  onFoodPress,
}: {
  content: string;
  onFoodPress: (food: Food | null, name: string) => void;
}) {
  const { searchFoods } = useFoodStore();
  const [items, setItems] = useState<Array<{ name: string; food: Food | null }>>([]);

  useEffect(() => {
    const names = extractFoodMentions(content);
    if (!names.length) return;

    (async () => {
      const resolved = await Promise.all(
        names.map(async (name) => {
          // 1. Try exact name
          let results = await searchFoods(name);
          // 2. Try each significant word
          if (!results.length) {
            const words = name.split(/\s+/).filter((w) => w.length > 3);
            for (const word of words) {
              results = await searchFoods(word);
              if (results.length) break;
            }
          }
          if (results[0]) return { name, food: results[0] };
          // 3. Auto-generate via backend AI and add to food list
          const generated = await autoCreateFood(name);
          return { name, food: generated };
        })
      );
      setItems(resolved.filter((item) => item.food !== null));
    })();
  }, [content, searchFoods]);

  if (!items.length) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#6b7280", marginBottom: 8, marginLeft: 2 }}>
        SUGGESTED FOODS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 170 }}
        contentContainerStyle={{ paddingRight: 4 }}
      >
        {items.map(({ name, food }, i) => (
          <FoodCard
            key={`${name}-${i}`}
            name={name}
            food={food}
            onPress={() => onFoodPress(food, name)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(560 - delay),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 140);
    const a3 = animate(dot3, 280);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 2 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#9ca3af" }, dotStyle(dot)]}
        />
      ))}
    </View>
  );
}

// ─── Streaming cursor ─────────────────────────────────────────────────────────

function StreamingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View style={{
      opacity, width: 2, height: 16, backgroundColor: "#1447e6",
      borderRadius: 1, marginLeft: 2, alignSelf: "flex-end", marginBottom: 2,
    }} />
  );
}

// ─── Inline text (bold support) ───────────────────────────────────────────────

function InlineText({ text, isAssistant }: { text: string; isAssistant: boolean }) {
  const textColor = isAssistant ? "#111827" : "#ffffff";
  const segments: Array<{ text: string; bold: boolean }> = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = boldRegex.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false });

  return (
    <Text style={{ fontSize: 15, lineHeight: 24, color: textColor }}>
      {segments.map((seg, i) =>
        seg.bold
          ? <Text key={i} style={{ fontWeight: "700", color: textColor }}>{seg.text}</Text>
          : <Text key={i}>{seg.text}</Text>
      )}
    </Text>
  );
}

// ─── Formatted message ────────────────────────────────────────────────────────

function FormattedMessage({
  content,
  isAssistant,
  isStreaming,
}: {
  content: string;
  isAssistant: boolean;
  isStreaming: boolean;
}) {
  const blocks = String(content || "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) return null;

  return (
    <View>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter(Boolean);

        const headingMatch = block.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
          return (
            <Text key={bi} style={{
              fontSize: 16, fontWeight: "700",
              color: isAssistant ? "#111827" : "#ffffff",
              marginTop: bi > 0 ? 12 : 0, marginBottom: 4, lineHeight: 24,
            }}>
              {headingMatch[1]}
            </Text>
          );
        }

        const isNumbered = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l.trim()));
        const isBullet = lines.length > 0 && lines.every((l) => /^[-•*]\s+/.test(l.trim()));

        if (isNumbered || isBullet) {
          return (
            <View key={bi} style={{ marginTop: bi > 0 ? 10 : 0 }}>
              {lines.map((line, li) => {
                const match = line.trim().match(/^((?:\d+\.)|[-•*])\s+(.*)$/);
                const marker = isNumbered ? (match?.[1] || `${li + 1}.`) : "•";
                const body = match?.[2] || line;
                return (
                  <View key={li} style={{ flexDirection: "row", marginTop: li > 0 ? 6 : 0 }}>
                    <Text style={{
                      fontSize: 15, lineHeight: 24,
                      color: isAssistant ? "#6b7280" : "rgba(255,255,255,0.8)",
                      width: 22, flexShrink: 0,
                      fontWeight: isNumbered ? "600" : "400",
                    }}>
                      {marker}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <InlineText text={body} isAssistant={isAssistant} />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }

        if (lines.length > 1) {
          return (
            <View key={bi} style={{ marginTop: bi > 0 ? 10 : 0 }}>
              {lines.map((line, li) => (
                <View key={li} style={{ marginTop: li > 0 ? 4 : 0 }}>
                  <InlineText text={line} isAssistant={isAssistant} />
                </View>
              ))}
            </View>
          );
        }

        return (
          <View key={bi} style={{ marginTop: bi > 0 ? 10 : 0, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" }}>
            <InlineText text={block} isAssistant={isAssistant} />
            {isStreaming && bi === blocks.length - 1 && <StreamingCursor />}
          </View>
        );
      })}
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onRetry,
  onFoodPress,
}: {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
  onFoodPress: (food: Food | null, name: string) => void;
}) {
  const isAssistant = message.role === "assistant";
  const isStreaming = Boolean(message.metadata?.streaming);
  const isFailed = message.status === "failed";
  const isEmpty = !message.content?.trim();

  const messageTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric", minute: "2-digit",
  });

  // Show food cards only when streaming is done and there is content
  const showFoodCards = isAssistant && !isStreaming && !isEmpty;

  return (
    <View style={{ marginBottom: 20, alignItems: isAssistant ? "flex-start" : "flex-end" }}>
      {/* Sender row */}
      <View style={{ flexDirection: isAssistant ? "row" : "row-reverse", alignItems: "center", marginBottom: 6 }}>
        {isAssistant ? (
          <View style={{
            width: 28, height: 28, borderRadius: 8,
            backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center",
          }}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
          }}>
            <User size={13} color="#374151" />
          </View>
        )}
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginHorizontal: 7 }}>
          {isAssistant ? "Gluvia AI" : "You"}
        </Text>
      </View>

      {/* Bubble */}
      <View style={[
        { maxWidth: "90%", paddingHorizontal: 16, paddingVertical: 12 },
        isAssistant
          ? {
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              borderBottomRightRadius: 20, borderBottomLeftRadius: 4,
              backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
            }
          : {
              borderTopLeftRadius: 20, borderTopRightRadius: 4,
              borderBottomRightRadius: 20, borderBottomLeftRadius: 20,
              backgroundColor: "#1447e6",
            },
      ]}>
        {isAssistant && isStreaming && isEmpty ? (
          <TypingDots />
        ) : (
          <FormattedMessage
            content={message.content}
            isAssistant={isAssistant}
            isStreaming={isStreaming}
          />
        )}
      </View>

      {/* Food recommendation cards */}
      {showFoodCards && (
        <View style={{ maxWidth: "100%", marginTop: 2 }}>
          <FoodCardsStrip content={message.content} onFoodPress={onFoodPress} />
        </View>
      )}

      {/* Footer */}
      <View style={{
        flexDirection: "row", alignItems: "center", marginTop: 4,
        justifyContent: isAssistant ? "flex-start" : "flex-end", gap: 6,
      }}>
        {!(isStreaming && isEmpty) && (
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>{messageTime}</Text>
        )}
        {isFailed && message.role === "user" && onRetry && (
          <Pressable
            onPress={() => onRetry(message)}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <RefreshCw size={10} color="#ef4444" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#ef4444" }}>
              <T>Retry</T>
            </Text>
          </Pressable>
        )}
        {message.metadata?.safeFallbackUsed && (
          <Text style={{ fontSize: 11, color: "#d97706" }}>
            <T>Safe fallback</T>
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Suggestion pill ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: "🩸", text: "What foods help manage blood sugar levels?" },
  { icon: "🥗", text: "Suggest a low-carb breakfast for a diabetic" },
  { icon: "📈", text: "Explain my glucose trend from this week" },
  { icon: "🔄", text: "What are healthy alternatives to white rice?" },
];

function SuggestionPill({
  icon,
  text,
  index,
  onPress,
}: {
  icon: string;
  text: string;
  index: number;
  onPress: (text: string) => void;
}) {
  const translateY = useRef(new Animated.Value(18)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay: 200 + index * 90,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: 200 + index * 90,
        useNativeDriver: true,
        damping: 16,
        stiffness: 140,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 14, stiffness: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }).start();
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(text); }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          borderWidth: 1.5,
          borderColor: "#e5e7eb",
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 13,
          backgroundColor: "#ffffff",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View style={{
          width: 34, height: 34, borderRadius: 10,
          backgroundColor: "#f0f4ff",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={{ fontSize: 13, color: "#1f2937", flex: 1, lineHeight: 19, fontWeight: "500" }}>
          {text}
        </Text>
        <ChevronRight size={14} color="#9ca3af" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSuggestionPress }: { onSuggestionPress: (text: string) => void }) {
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 120 }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [iconOpacity, iconScale, subtitleOpacity, titleOpacity]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
      {/* Icon */}
      <Animated.View style={{
        opacity: iconOpacity,
        transform: [{ scale: iconScale }],
        width: 72, height: 72, borderRadius: 22,
        backgroundColor: "#eff6ff",
        alignItems: "center", justifyContent: "center",
        marginBottom: 18,
        shadowColor: "#1447e6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 3,
      }}>
        <Ionicons name="logo-reddit" size={36} color="#1447e6" />
      </Animated.View>

      {/* Title */}
      <Animated.Text style={{
        opacity: titleOpacity,
        fontSize: 22, fontWeight: "800", color: "#0f172a",
        textAlign: "center", marginBottom: 8, letterSpacing: -0.3,
      }}>
        Ask Gluvia AI
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={{
        opacity: subtitleOpacity,
        fontSize: 14, lineHeight: 22, color: "#6b7280", textAlign: "center", marginBottom: 28,
      }}>
        Your personal diabetes health assistant. Ask anything about food, glucose, or your profile.
      </Animated.Text>

      {/* Suggestion pills */}
      <View style={{ width: "100%", gap: 10 }}>
        {SUGGESTIONS.map((s, i) => (
          <SuggestionPill
            key={i}
            icon={s.icon}
            text={s.text}
            index={i}
            onPress={onSuggestionPress}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AIConversationScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isOnline = useSyncStore((state) => state.isOnline);
  const {
    currentConversation,
    messages,
    isLoading,
    isSending,
    isStreaming,
    error,
    startNewConversation,
    openConversation,
    sendMessage,
    retryMessage,
  } = useChatStore();

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [input, setInput] = useState("");
  const lastHapticMessageRef = useRef<string | null>(null);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const activeIdRef = useRef<string>(id ?? "new");
  const isNewConversation = id === "new";

  // Food detail modal state
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [foodModalVisible, setFoodModalVisible] = useState(false);

  const handleFoodPress = useCallback((food: Food | null, _name: string) => {
    if (!food) return;
    // Set food first so the modal never renders with food=null while visible=true
    setSelectedFood(food);
    setTimeout(() => setFoodModalVisible(true), 0);
  }, []);

  const headerTitle = useMemo(() => {
    if (!currentConversation?.title || isNewConversation) return t("New chat");
    return currentConversation.title;
  }, [currentConversation?.title, isNewConversation, t]);

  useEffect(() => {
    if (!id) return;
    if (id === "new") {
      startNewConversation().catch(() => {});
    } else {
      openConversation(id).catch(() => {});
    }
  }, [id, openConversation, startNewConversation]);

  useFocusEffect(
    useCallback(() => {
      if (currentConversation?.id && currentConversation.id !== "new") return;
      if (id && id !== "new") openConversation(id).catch(() => {});
    }, [currentConversation?.id, id, openConversation])
  );

  useEffect(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content.trim().length > 0);
    if (!latestAssistant || lastHapticMessageRef.current === latestAssistant.id) return;
    lastHapticMessageRef.current = latestAssistant.id;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [messages]);

  const scrollToEnd = useCallback((animated = true) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      const atBottom = distanceFromBottom < 60;
      isAtBottomRef.current = atBottom;
      setShowScrollBtn(!atBottom && (isSending || isStreaming));
    },
    [isSending, isStreaming]
  );

  const scrollToBottom = useCallback(() => {
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
    scrollToEnd(true);
  }, [scrollToEnd]);

  const sendText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !isOnline || isSending) return;
    setInput("");
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
    Haptics.selectionAsync().catch(() => {});
    const result = await sendMessage(trimmed);
    if (result.conversationId && activeIdRef.current !== result.conversationId) {
      activeIdRef.current = result.conversationId;
      router.replace(`/ai-chat/${result.conversationId}` as any);
    }
  }, [isOnline, isSending, sendMessage]);

  // Called by the send button / keyboard submit — reads from input state
  const handleSend = useCallback(() => sendText(input), [input, sendText]);

  // Called by suggestion pills — receives text directly, no event object
  const handleSuggestionPress = useCallback((text: string) => {
    if (!isOnline || isSending || isStreaming) return;
    sendText(text);
  }, [isOnline, isSending, isStreaming, sendText]);

  const handleRetry = useCallback(
    async (message: ChatMessage) => {
      if (!message.content.trim() || isSending || isStreaming || !isOnline) return;
      setRetryingMessageId(message.id);
      const result = await retryMessage(message.id);
      if (result.conversationId && activeIdRef.current !== result.conversationId) {
        activeIdRef.current = result.conversationId;
        router.replace(`/ai-chat/${result.conversationId}` as any);
      }
      setRetryingMessageId(null);
    },
    [isOnline, isSending, isStreaming, retryMessage]
  );

  const canSend = input.trim().length > 0 && !isSending && !isStreaming && isOnline;

  // Stable key that avoids duplicate-key crash when IDs collide during optimistic updates
  const keyExtractor = useCallback(
    (item: ChatMessage, index: number) => `${item.id}-${index}`,
    []
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
      >
        {/* ── Header ── */}
        <View style={{
          borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
          backgroundColor: "#ffffff", paddingHorizontal: 16, paddingVertical: 12,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{
                width: 40, height: 40, alignItems: "center", justifyContent: "center",
                borderRadius: 20, backgroundColor: "#f9fafb",
                borderWidth: 1, borderColor: "#f3f4f6",
              }}
            >
              <ChevronLeft size={20} color="#374151" />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
                {headerTitle}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: isStreaming ? "#10b981" : isOnline ? "#6b7280" : "#ef4444",
                }} />
                <Text style={{ fontSize: 11, color: "#6b7280" }}>
                  {isStreaming ? t("Responding…") : !isOnline ? t("Offline") : t("Gluvia AI")}
                </Text>
              </View>
            </View>

            <View style={{
              width: 40, height: 40, alignItems: "center", justifyContent: "center",
              borderRadius: 20, backgroundColor: "#eff6ff",
            }}>
              {isOnline ? <Ionicons name="logo-reddit" size={18} color="#1447e6" /> : <WifiOff size={16} color="#9ca3af" />}
            </View>
          </View>
        </View>

        {/* ── Offline banner ── */}
        {!isOnline && (
          <View style={{
            marginHorizontal: 16, marginTop: 12, borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a",
            flexDirection: "row", alignItems: "center", gap: 10,
          }}>
            <WifiOff size={14} color="#d97706" />
            <Text style={{ fontSize: 13, color: "#92400e", flex: 1, lineHeight: 20 }}>
              <T>{"You're offline. Reconnect to chat with Gluvia AI."}</T>
            </Text>
          </View>
        )}

        {/* ── Error banner ── */}
        {error ? (
          <View style={{
            marginHorizontal: 16, marginTop: 12, borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca",
          }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#dc2626", marginBottom: 2 }}>
              <T>Chat unavailable</T>
            </Text>
            <Text style={{ fontSize: 13, color: "#dc2626", lineHeight: 20 }}>{error}</Text>
          </View>
        ) : null}

        {/* ── Message list ── */}
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb",
                backgroundColor: "#ffffff", paddingHorizontal: 20, paddingVertical: 14,
              }}>
                <AppLoader size="sm" color="#1447e6" />
                <Text style={{ fontSize: 14, color: "#6b7280" }}>
                  <T>Loading conversation…</T>
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={keyExtractor}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28, flexGrow: 1,
              }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (isAtBottomRef.current) scrollToEnd(messages.length > 1);
              }}
              onLayout={() => scrollToEnd(false)}
              ListEmptyComponent={<EmptyState onSuggestionPress={handleSuggestionPress} />}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  onRetry={item.id === retryingMessageId ? undefined : handleRetry}
                  onFoodPress={handleFoodPress}
                />
              )}
            />
          )}

          {/* Scroll-to-bottom FAB */}
          {showScrollBtn && (
            <Pressable
              onPress={scrollToBottom}
              style={{
                position: "absolute", bottom: 12, alignSelf: "center",
                flexDirection: "row", alignItems: "center", gap: 6,
                borderRadius: 20, borderWidth: 1, borderColor: "#e5e7eb",
                backgroundColor: "#ffffff",
                paddingHorizontal: 14, paddingVertical: 8,
                shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
              }}
            >
              <ArrowDown size={13} color="#374151" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>
                <T>Jump to latest</T>
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Input bar ── */}
        <View style={{
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Platform.OS === "ios" ? 8 : 12,
        }}>
          {/* Input row */}
          <View style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            backgroundColor: "#f7f8fa",
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: input.trim() ? "#1447e6" : "#e8eaed",
            paddingLeft: 18,
            paddingRight: 6,
            paddingVertical: 6,
            minHeight: 52,
            shadowColor: "#1447e6",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: input.trim() ? 0.08 : 0,
            shadowRadius: 6,
            elevation: input.trim() ? 1 : 0,
          }}>
            <TextInput
              multiline
              value={input}
              onChangeText={setInput}
              placeholder={t("Message Gluvia AI…")}
              placeholderTextColor="#adb5bd"
              style={{
                flex: 1,
                fontSize: 15,
                lineHeight: 22,
                color: "#111827",
                maxHeight: 120,
                paddingTop: Platform.OS === "ios" ? 8 : 6,
                paddingBottom: Platform.OS === "ios" ? 8 : 6,
                padding: 0,
              }}
              editable={!isSending && !isStreaming && isOnline}
              onSubmitEditing={canSend ? handleSend : undefined}
              blurOnSubmit={false}
              textAlignVertical="top"
            />

            {/* Send button — inside the input pill */}
            <Pressable
              onPress={canSend ? handleSend : undefined}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSend ? "#1447e6" : "#e8eaed",
                marginBottom: 0,
              }}
            >
              {isSending || isStreaming ? (
                <AppLoader size="sm" color={canSend ? "#ffffff" : "#9ca3af"} />
              ) : (
                <Send
                  size={16}
                  color={canSend ? "#ffffff" : "#9ca3af"}
                  style={{ marginLeft: 1 }}
                />
              )}
            </Pressable>
          </View>

          {/* Disclaimer */}
          <Text style={{
            fontSize: 11,
            color: "#b0b7c3",
            textAlign: "center",
            marginTop: 8,
            lineHeight: 16,
          }}>
            <T>Gluvia AI may make mistakes. Consult your healthcare provider.</T>
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── Food Detail Modal ── */}
      <FoodDetailModal
        food={selectedFood}
        visible={foodModalVisible}
        onClose={() => { setFoodModalVisible(false); setSelectedFood(null); }}
      />
    </SafeAreaView>
  );
}

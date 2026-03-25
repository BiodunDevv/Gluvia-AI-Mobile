import { SupportedLanguage } from "@/lib/translations";

const LANGUAGE_CODE_MAP: Record<SupportedLanguage, string> = {
  english: "en",
  hausa: "ha",
  yoruba: "yo",
  igbo: "ig",
};

const translationCache = new Map<string, string>();

function getTranslatorConfig() {
  const apiKey = process.env.EXPO_PUBLIC_TRANSLATOR_API_KEY?.trim();
  const endpoint = process.env.EXPO_PUBLIC_TRANSLATOR_ENDPOINT?.trim();
  const region = process.env.EXPO_PUBLIC_TRANSLATOR_REGION?.trim();

  if (!apiKey || !endpoint || !region) {
    return null;
  }

  return {
    apiKey,
    endpoint: endpoint.replace(/\/$/, ""),
    region,
  };
}

export function canUseAzureTranslator(language: SupportedLanguage) {
  return language !== "english" && Boolean(getTranslatorConfig());
}

export async function translateDynamicText(
  text: string,
  language: SupportedLanguage
) {
  const normalizedText = text?.trim();

  if (!normalizedText || language === "english") {
    return text;
  }

  const config = getTranslatorConfig();

  if (!config) {
    return text;
  }

  const cacheKey = `${language}:${normalizedText}`;
  const cached = translationCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${config.endpoint}/translate?api-version=3.0&to=${LANGUAGE_CODE_MAP[language]}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": config.apiKey,
          "Ocp-Apim-Subscription-Region": config.region,
        },
        body: JSON.stringify([{ text: normalizedText }]),
      }
    );

    if (!response.ok) {
      return text;
    }

    const payload = await response.json();
    const translated =
      payload?.[0]?.translations?.[0]?.text?.trim() || normalizedText;

    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API if key is present and not default placeholder
const apiKey = process.env.GEMINI_API_KEY;
const isMockKey = !apiKey || apiKey === 'mock_key_or_replace_me' || apiKey.startsWith('your_');

let genAI: GoogleGenerativeAI | null = null;
if (!isMockKey) {
  genAI = new GoogleGenerativeAI(apiKey as string);
}

// Fallback Generators for Offline/Mock mode
const mockDateSuggestions = [
  "✨ **Cosy Starlit Fort Night**\nBuild a blanket fort in the living room with fairy lights. Prepare a platter of cheese, fruits, and wine. Put on a nostalgic movie or play a card game together.\n\n*Budget: Low (~$15)* | *Mood: Cosy & Intimate*",
  "🎨 **Paint & Sip at Home**\nBuy two cheap canvases and acrylic paints. Find a landscape tutorial online and follow along together. Toast with sparkling cider or wine. No experience needed!\n\n*Budget: Medium (~$30)* | *Mood: Creative & Fun*",
  "🌸 **Botanical Picnic Escape**\nPack a picnic basket with sandwiches, croissants, and fresh berries. Head to the nearest botanical garden or local park. Bring a couple's quiz or book to read to each other.\n\n*Budget: Low (~$20)* | *Mood: Relaxing & Romantic*"
];

const mockGiftRecommendations = [
  "🎁 **A Custom Memory Book**\nCollect photos and write down short stories of your favorite moments together. You can use services like Shutterfly or hand-craft a scrapbook.\n\n*Occasion: Anniversary/Valentine's* | *Est. Cost: $25 - $50*",
  "✨ **Matching Initial Jewelry**\nSleek, minimalist necklaces or bracelets engraved with each other's initials. A subtle and premium daily reminder of your bond.\n\n*Occasion: Birthday* | *Est. Cost: $40 - $100*",
  "🎟️ **An 'Experience' Coupon Book**\nCreate custom vouchers for things like 'Breakfast in bed', 'Massage night', or 'Partner chooses the movie'. It promotes shared activities!\n\n*Occasion: Just Because* | *Est. Cost: Custom*"
];

export const getRelationshipAdvice = async (
  history: { role: 'user' | 'model'; content: string }[],
  userMessage: string
): Promise<string> => {
  if (isMockKey || !genAI) {
    console.log('[AI Service] Using mock advisor response (Gemini API key missing/invalid)');
    return `Hello! As your AI relationship coach, I'm here to support you. It sounds like you are reflecting on your connection. My advice is to focus on active listening—hearing your partner's emotions, not just their words. Try setting aside 15 minutes of uninterrupted 'catch-up' time tonight. What do you think about trying this?`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      systemInstruction: 'You are an empathetic, professional couple relationship counselor. Provide short, constructive, warm, and highly practical relationship advice. Keep your response under 3 paragraphs.',
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error in getRelationshipAdvice:', error);
    return 'I had trouble reaching my AI core, but remember: communication is the foundation of any strong relationship. Take a deep breath and share how you feel using "I" statements.';
  }
};

export const getDateSuggestions = async (
  location: string,
  budget: string,
  mood: string,
  interests: string
): Promise<string> => {
  if (isMockKey || !genAI) {
    console.log('[AI Service] Using mock date suggestions');
    return mockDateSuggestions.join('\n\n---\n\n');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Generate 3 unique, specific, and creative date ideas for a couple based on the following:
Location/Setting: ${location}
Budget Level: ${budget}
Mood: ${mood}
Interests/Hobbies: ${interests}
Provide the response in beautiful markdown, with bold headings, estimated costs, and a brief description of how to prepare for it.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error in getDateSuggestions:', error);
    return mockDateSuggestions.join('\n\n---\n\n');
  }
};

export const getGiftRecommendations = async (
  occasion: string,
  recipientInterests: string,
  budget: string
): Promise<string> => {
  if (isMockKey || !genAI) {
    console.log('[AI Service] Using mock gift suggestions');
    return mockGiftRecommendations.join('\n\n---\n\n');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Suggest 3 personalized gift ideas for a partner:
Occasion: ${occasion}
Interests/Hobbies: ${recipientInterests}
Budget Level: ${budget}
Explain why it is a thoughtful gift and what makes it special. Format in clean markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error in getGiftRecommendations:', error);
    return mockGiftRecommendations.join('\n\n---\n\n');
  }
};

export const generateConversationStarters = async (): Promise<string[]> => {
  if (isMockKey || !genAI) {
    return [
      "If we could teleport anywhere in the world for 24 hours, where would we go and what would we do?",
      "What is a small, everyday thing I do that makes you feel appreciated or loved?",
      "If we could write a book about our relationship, what would the title of the first chapter be?",
      "What's a new hobby or skill you've been wanting to try that we could learn together?",
      "What is one memory of us that always makes you smile when you're having a tough day?"
    ];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Generate 5 unique, deep, and romantic conversation starting questions for couples. Return ONLY a JSON string array of 5 questions, formatted like: ["question 1", "question 2", ...]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    // Try to extract JSON array
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [
      "What's a dream we haven't talked about yet?",
      "How have we changed most since we first met?",
      "What's your favorite way to unwind together?",
      "What's a trip you'd love to take next year?",
      "What's one thing you appreciate about our communication?"
    ];
  } catch (error) {
    console.error('Gemini API Error in generateConversationStarters:', error);
    return [
      "If we could teleport anywhere in the world for 24 hours, where would we go?",
      "What is a small thing I do that makes you feel loved?",
      "What's your favorite memory of our first date?",
      "What's a new hobby we should try together?",
      "What memory of us always makes you smile?"
    ];
  }
};

export const analyzeMoodAndRelationship = async (
  diaries: { content: string; mood: string; authorName: string }[]
): Promise<{ score: number; trend: string; analysis: string; advice: string }> => {
  const fallbackResult = {
    score: 88,
    trend: 'Steady & Romantic',
    analysis: 'Your logs show a healthy mix of deep appreciation and shared emotional clarity. Moods are predominantly positive, reflecting high stability.',
    advice: 'Try to continue making daily entries. Plan a surprise date this weekend to maintain the romantic spark and unlock the next XP tier!'
  };

  if (diaries.length === 0) {
    return fallbackResult;
  }

  if (isMockKey || !genAI) {
    console.log('[AI Service] Using mock mood analysis');
    return fallbackResult;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const diaryContentStr = diaries
      .map((d) => `[${d.authorName} - Mood: ${d.mood}]: "${d.content}"`)
      .join('\n');

    const prompt = `You are a couple's AI relationship analyst. Analyze the following couple's joint diary logs from the past week:
${diaryContentStr}

Based on these entries, generate:
1. A weekly relationship compatibility score (number between 1 and 100).
2. A short relationship mood trend title (e.g. "Passionate but Stressed" or "Warm and Harmonious").
3. A short, concise analysis paragraph summarizing their emotional climate.
4. A short paragraph of action-oriented advice to help them grow closer.

Return your response strictly as a JSON object matching this structure:
{
  "score": number,
  "trend": "string",
  "analysis": "string",
  "advice": "string"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return fallbackResult;
  } catch (error) {
    console.error('Gemini API Error in analyzeMoodAndRelationship:', error);
    return fallbackResult;
  }
};

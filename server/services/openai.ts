import OpenAI from "openai";
import { ArticleSummary, Recommendation } from "@shared/schema";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const model = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates a summary of an article using OpenAI
 * @param title The article title
 * @param content The article content to summarize
 * @returns A summary of the article and keywords
 */
export async function generateArticleSummary(title: string, content: string): Promise<{ summary: string; keywords: string[] }> {
  try {
    const prompt = `
    Summarize the following article in 2-3 sentences. Also extract 3-5 main keywords or topics.
    
    Title: ${title}
    
    Content: ${content}
    
    Format your response as a JSON object with the following structure:
    {
      "summary": "Your concise summary here",
      "keywords": ["keyword1", "keyword2", "keyword3", ...]
    }
    `;

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      summary: result.summary,
      keywords: result.keywords,
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    return {
      summary: "Error generating summary",
      keywords: [],
    };
  }
}

/**
 * Analyzes if an article would be interesting to the user based on their interests
 * @param userInterests The user's interests profile text
 * @param title The article title
 * @param summary The article summary
 * @param keywords Keywords from the article
 * @returns Whether the article is relevant and why
 */
export async function analyzeArticleRelevance(
  userInterests: string,
  title: string,
  summary: string,
  keywords: string[]
): Promise<{ isRelevant: boolean; relevanceScore: number; reason: string }> {
  try {
    const prompt = `
    Analyze if the following article would be interesting to the user based on their interests.
    
    User Interests: "${userInterests}"
    
    Article:
    Title: ${title}
    Summary: ${summary}
    Keywords: ${keywords.join(", ")}
    
    Determine:
    1. Whether this article is relevant to the user's interests
    2. On a scale of 1-100, how relevant it is (relevance score)
    3. Explain in 1-2 sentences why it would be interesting to the user, referencing specific interests
    
    Format your response as a JSON object with the following structure:
    {
      "isRelevant": true/false,
      "relevanceScore": number between 1-100,
      "reason": "Your explanation of why it's relevant to this user"
    }
    `;

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      isRelevant: result.isRelevant,
      relevanceScore: result.relevanceScore,
      reason: result.reason,
    };
  } catch (error) {
    console.error("Error analyzing relevance:", error);
    return {
      isRelevant: false,
      relevanceScore: 0,
      reason: "Error analyzing relevance",
    };
  }
}
import OpenAI from "openai";
import { ArticleSummary, Recommendation } from "@shared/schema";

// Changed from gpt-4o to o4-mini as requested by the user
const model = "o4-mini";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts the main content from HTML, removing tags, scripts, and styles
 */
function extractMainContent(htmlContent: string): string {
  // If it's not HTML, return as is
  if (!htmlContent.includes('<html') && !htmlContent.includes('<body')) {
    return htmlContent;
  }
  
  // Very basic extraction - remove HTML tags, scripts, styles
  let content = htmlContent;
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  content = content.replace(/<[^>]*>/g, ' ');
  content = content.replace(/\s+/g, ' ').trim();
  
  return content;
}

/**
 * Limits content length to avoid OpenAI rate limits
 */
function truncateContent(content: string, maxChars = 4000): string {
  if (!content) return '';
  
  // Extract main content if it's HTML
  const extractedContent = extractMainContent(content);
  
  // Truncate if needed
  if (extractedContent.length <= maxChars) {
    return extractedContent;
  }
  
  // Take first portion which likely has the most important content
  return extractedContent.substring(0, maxChars) + '... [content truncated]';
}

/**
 * Generates a summary of an article using OpenAI
 * @param title The article title
 * @param content The article content to summarize
 * @returns A summary of the article and keywords
 */
export async function generateArticleSummary(title: string, content: string): Promise<{ summary: string; keywords: string[] }> {
  try {
    // Truncate content to avoid rate limits
    const truncatedContent = truncateContent(content);
    
    const prompt = `
    Summarize the following article in 2-3 sentences. Also extract 3-5 main keywords or topics.
    
    Title: ${title}
    
    Content: ${truncatedContent}
    
    Format your response as a JSON object with the following structure:
    {
      "summary": "Your concise summary here",
      "keywords": ["keyword1", "keyword2", "keyword3", ...]
    }
    
    Ensure your response is a valid JSON object as described above.
    `;

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    // Handle potential null content from API response
    const responseContent = response.choices[0]?.message?.content || '{"summary":"Unable to generate summary","keywords":[]}';
    const result = JSON.parse(responseContent);
    
    return {
      summary: result.summary,
      keywords: result.keywords || [],
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
    
    Ensure your response is a valid JSON object as described above.
    `;

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    // Handle potential null content from API response
    const responseContent = response.choices[0]?.message?.content || '{"isRelevant":false,"relevanceScore":0,"reason":"Unable to analyze relevance"}';
    const result = JSON.parse(responseContent);
    
    return {
      isRelevant: Boolean(result.isRelevant),
      relevanceScore: Number(result.relevanceScore) || 0,
      reason: result.reason || "Unable to determine relevance",
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
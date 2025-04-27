import OpenAI from "openai";
import { ArticleSummary, Recommendation, ArticlePreference } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const model = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Log OpenAI API calls for debugging
function logOpenAICall(operation: string, prompt: string) {
  console.log(`[OpenAI API] 📞 Making API call for: ${operation}`);
  console.log(`[OpenAI API] 📝 Prompt snippet: ${prompt.substring(0, 100)}...`);
}

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

    // Log the OpenAI call
    logOpenAICall("generateArticleSummary", prompt);

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    // Handle potential null content from API response
    const responseContent = response.choices[0]?.message?.content || '{"summary":"Unable to generate summary","keywords":[]}';
    const result = JSON.parse(responseContent);
    
    console.log(`[OpenAI API] ✅ Generated summary for article "${title}"`);
    
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

    // Log the OpenAI call
    logOpenAICall("analyzeArticleRelevance", prompt);

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

/**
 * Rescores an article's relevance based on user preference feedback
 * @param userInterests The user's interests profile text
 * @param articleTitle The article title
 * @param articleSummary The article summary
 * @param userPreference The user's preference (upvote/downvote)
 * @param userExplanation The user's explanation for their preference
 * @returns The new relevance analysis
 */
export async function rescoreArticleWithUserFeedback(
  userInterests: string,
  articleTitle: string,
  articleSummary: ArticleSummary | null,
  userPreference: ArticlePreference,
  previousRecommendation: Recommendation | null
): Promise<{ isRelevant: boolean; relevanceScore: number; reason: string }> {
  try {
    const summary = articleSummary?.summary || "No summary available";
    const keywords = articleSummary?.keywords || [];
    const previousScore = previousRecommendation?.relevanceScore || 50;
    const previousReason = previousRecommendation?.reasonForRecommendation || "No previous recommendation";

    const prompt = `
    Analyze the relevance of an article to a user, taking into account their explicit preference feedback.
    
    User Interests: "${userInterests}"
    
    Article:
    Title: ${articleTitle}
    Summary: ${summary}
    Keywords: ${keywords.join(", ")}
    
    User Feedback:
    Preference: ${userPreference.preference.toUpperCase()}
    Explanation: ${userPreference.explanation || "No explanation provided"}
    
    Previous Recommendation:
    Score: ${previousScore}/100
    Reason: "${previousReason}"
    
    Based on the user's interests and their explicit feedback on this article, recalculate:
    1. Whether this article is relevant to the user's interests
    2. On a scale of 1-100, how relevant it is (relevance score) - adjust from previous score based on user's feedback
    3. Explain in 1-2 sentences why this article is or isn't relevant to the user, taking their feedback into account
    
    Format your response as a JSON object with the following structure:
    {
      "isRelevant": true/false,
      "relevanceScore": number between 1-100,
      "reason": "Your explanation of relevance factoring in user feedback"
    }
    
    Ensure your response is a valid JSON object as described above.
    `;

    // Log the OpenAI call
    logOpenAICall("rescoreArticleWithUserFeedback", prompt);

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    // Handle potential null content from API response
    const responseContent = response.choices[0]?.message?.content || 
      '{"isRelevant":false,"relevanceScore":0,"reason":"Unable to analyze relevance based on feedback"}';
    const result = JSON.parse(responseContent);
    
    console.log(`[OpenAI API] ✅ Rescored article "${articleTitle}" - New score: ${result.relevanceScore}/100`);
    
    return {
      isRelevant: Boolean(result.isRelevant),
      relevanceScore: Number(result.relevanceScore) || 0,
      reason: result.reason || "Relevance adjusted based on your feedback",
    };
  } catch (error) {
    console.error("Error rescoring with feedback:", error);
    return {
      isRelevant: false,
      relevanceScore: 0,
      reason: "Error adjusting relevance based on feedback",
    };
  }
}

/**
 * Updates a user's interest profile based on their article preferences
 * @param currentInterests The user's current interests profile
 * @param recentPreferences Array of the user's recent article preferences with explanations
 * @returns Updated interests profile
 */
export async function updateUserInterestsFromPreferences(
  currentInterests: string,
  recentPreferences: Array<{
    articleTitle: string,
    preference: string,
    explanation: string | null
  }>
): Promise<string> {
  try {
    // Build a string of recent preferences
    const preferencesText = recentPreferences
      .map(p => `Article: "${p.articleTitle}" - ${p.preference.toUpperCase()} - Explanation: ${p.explanation || "None"}`)
      .join("\n");

    const prompt = `
    Update a user's interest profile based on their recent article preferences.
    
    Current interests profile: "${currentInterests}"
    
    Recent article preferences:
    ${preferencesText}
    
    Based on these recent preferences, refine and update the user's interest profile. Keep the existing interests
    that still seem relevant, but adjust for new interests revealed by their preferences and explanations.
    
    Return only the updated interest profile text, without any additional explanations or formatting.
    Make it approximately the same length as the current profile.
    `;

    // Log the OpenAI call
    logOpenAICall("updateUserInterestsFromPreferences", prompt);

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }]
    });

    const updatedInterests = response.choices[0]?.message?.content || currentInterests;
    
    console.log(`[OpenAI API] ✅ Updated user interests profile based on ${recentPreferences.length} preferences`);
    
    return updatedInterests;
  } catch (error) {
    console.error("Error updating interests from preferences:", error);
    return currentInterests; // Return original on error
  }
}
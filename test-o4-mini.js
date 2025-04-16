import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testO4MiniModel() {
  console.log("Testing the o4-mini model with a simple request...");
  
  try {
    const response = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        { 
          role: "user", 
          content: "Analyze this news article title and give me a relevance score from 1-100 for someone interested in AI: 'New Breakthrough in Machine Learning Enables Faster Training on Consumer Hardware'. Respond with a JSON object that includes the relevance score and reason."
        }
      ],
      response_format: { type: "json_object" }
    });
    
    console.log("\nAPI Response:");
    console.log("Status:", response.object);
    console.log("Model used:", response.model);
    console.log("Usage:", response.usage);
    console.log("\nResponse content:");
    console.log(response.choices[0]?.message?.content);
    
    // Parse the response to check if it's valid JSON
    try {
      const parsedResponse = JSON.parse(response.choices[0]?.message?.content || "{}");
      console.log("\nParsed JSON response:");
      console.log(JSON.stringify(parsedResponse, null, 2));
      console.log("\nAPI request to o4-mini was successful!");
    } catch (parseError) {
      console.error("\nFailed to parse response as JSON:", parseError);
      console.log("Raw response:", response.choices[0]?.message?.content);
    }
    
  } catch (error) {
    console.error("\nError making API request to o4-mini:");
    if (error.status) {
      console.error(`Status code: ${error.status}`);
    }
    console.error(error.message);
    
    // Check if it's a specific model-related error
    if (error.message.includes("does not exist") || error.message.includes("model_not_found")) {
      console.error("\nThe o4-mini model does not exist or is not available with your API key.");
    }
  }
}

// Run the test
testO4MiniModel();
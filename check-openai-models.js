import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function listModels() {
  try {
    console.log("Fetching available OpenAI models...");
    const models = await openai.models.list();
    
    console.log("\nAvailable models:");
    // Sort models by ID for easier reading
    const sortedModels = models.data.sort((a, b) => a.id.localeCompare(b.id));
    
    // Create filtered lists for different model types
    const gptModels = sortedModels.filter(model => 
      model.id.includes("gpt-") && !model.id.includes("instruct"));
    
    const o1Models = sortedModels.filter(model => 
      model.id.includes("o1-"));
    
    console.log("\nGPT models:");
    gptModels.forEach(model => console.log(`- ${model.id}`));
    
    console.log("\nO1 models (if available):");
    if (o1Models.length > 0) {
      o1Models.forEach(model => console.log(`- ${model.id}`));
    } else {
      console.log("No O1 models found");
    }
    
    // Look specifically for o1-mini
    const o1Mini = sortedModels.find(model => model.id === "o1-mini");
    if (o1Mini) {
      console.log("\nO1-mini model is available!");
      console.log("Details:", o1Mini);
    } else {
      console.log("\nO1-mini model not found in available models");
    }
    
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
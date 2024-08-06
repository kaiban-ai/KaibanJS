import {logger} from "./logger";

const modelsPricing = [
    {
      "modelCode": "gpt-4o-mini",
      "provider": "openai",
      "inputPricePerMillionTokens": 0.150,
      "outputPricePerMillionTokens": 0.600,
      "features": "Most cost-efficient with vision capabilities"
    },
    {
      "modelCode": "gpt-3.5-turbo",
      "provider": "openai",
      "inputPricePerMillionTokens": 0.50,
      "outputPricePerMillionTokens": 1.50,
      "features": "Cost-effective option"
    },
    {
      "modelCode": "gpt-3.5-turbo-0125",
      "provider": "openai",
      "inputPricePerMillionTokens": 0.50,
      "outputPricePerMillionTokens": 1.50,
      "features": "Cost-effective option"
    },
    {
      "modelCode": "gpt-4o",
      "provider": "openai",
      "inputPricePerMillionTokens": 5.00,
      "outputPricePerMillionTokens": 15.00,
      "features": "Enhanced multimodal capabilities"
    },
    {
      "modelCode": "gpt-4-turbo",
      "provider": "openai",
      "inputPricePerMillionTokens": 10.00,
      "outputPricePerMillionTokens": 30.00,
      "features": "High speed and power"
    },
    {
      "modelCode": "gpt-4",
      "provider": "openai",
      "inputPricePerMillionTokens": 30.00,
      "outputPricePerMillionTokens": 60.00,
      "features": "Latest generation AI"
    }
];
  
/**
 * Calculates the approximate cost of using a specified AI model based on the number of input and output tokens.
 * If the model code does not match any in the predefined list, it returns a standardized error response with costs set to -1.
 *
 * @param {string} modelCode - The unique code identifier for the AI model.
 * @param {object} llmUsageStats - An object containing usage statistics including:
 *     - inputTokens: The number of input tokens processed.
 *     - outputTokens: The number of output tokens generated.
 *     - callsCount: The total number of calls made.
 *     - callsErrorCount: The number of failed calls.
 *     - parsingErrors: The number of errors encountered during parsing.
 * @returns {object} An object containing:
 *     - costInputTokens: The calculated cost for the input tokens or -1 if the model is not found.
 *     - costOutputTokens: The calculated cost for the output tokens or -1 if the model is not found.
 *     - totalCost: The total cost combining input and output tokens or -1 if the model is not found.
 *
 * @example
 * // Calculate costs for a known model with usage stats
 * const llmUsageStats = {
 *   inputTokens: 500000,
 *   outputTokens: 200000,
 *   callsCount: 10,
 *   callsErrorCount: 1,
 *   parsingErrors: 0
 * };
 * const costDetails = calculateCost('gpt-4o-mini', llmUsageStats);
 * console.log(costDetails);
 */
function calculateTaskCost(modelCode, llmUsageStats) {
    const model = modelsPricing.find(m => m.modelCode === modelCode);
    if (!model) {
      return {
        costInputTokens: -1,
        costOutputTokens: -1,
        totalCost: -1
      };
    }
  
    const inputCost = (llmUsageStats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
    const outputCost = (llmUsageStats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
    const totalCost = inputCost + outputCost;
  
    return {
        costInputTokens: parseFloat(inputCost.toFixed(4)),
        costOutputTokens: parseFloat(outputCost.toFixed(4)),
        totalCost: parseFloat(totalCost.toFixed(4))
    };
  }
  

function calculateTotalWorkflowCost(modelUsageStats) {
    let totalInputCost = 0;
    let totalOutputCost = 0;
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let allPricesAvailable = true;

    Object.keys(modelUsageStats).forEach(modelCode => {
        const stats = modelUsageStats[modelCode];
        const model = modelsPricing.find(m => m.modelCode === modelCode);
        if (!model) {
            logger.warn(`No pricing information found for model ${modelCode}`);
            allPricesAvailable = false;
            return;
        }
        const inputCost = (stats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
        const outputCost = (stats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
        totalInputCost += inputCost;
        totalOutputCost += outputCost;
        totalCost += inputCost + outputCost;
        totalInputTokens += stats.inputTokens;
        totalOutputTokens += stats.outputTokens;
    });

    if (!allPricesAvailable) {
        return {
            costInputTokens: -1,
            costOutputTokens: -1,
            totalCost: -1
        };
    }

    return {
        costInputTokens: parseFloat(totalInputCost.toFixed(4)),
        costOutputTokens: parseFloat(totalOutputCost.toFixed(4)),
        totalCost: parseFloat(totalCost.toFixed(4))
    };
}

export { calculateTaskCost, calculateTotalWorkflowCost };

  
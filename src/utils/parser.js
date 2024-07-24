// Utility function to clean up JSON string. to be able to parse it. later

//Examples Input

// Example 1
// "{
//    "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information. Since this is a future event (as of my last update), I should verify if it has already taken place or if there are any changes to the schedule."
//    "action": "tavily_search_results_json",
//    "actionInput": {"query":"Copa America 2024 winner results details"}
// }"

// Example 2
// {\n   "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information. Since this is a future event, I should be cautious about the results and verify if the tournament has actually taken place."\n   "action": "tavily_search_results_json",\n   "actionInput": {"query":"Copa America 2024 winner results details"}\n}

const getParsedJSON = (str) => {
    try {
        // Directly attempt to parse the JSON first
        return JSON.parse(str);
    } catch (error) {
        // console.error("Initial parsing failed. Error:", error);

        // Strip out everything before the first '{' to remove non-JSON headers
        const startIndex = str.indexOf('{');
        if (startIndex === -1) {
            // console.error("No JSON object found.");
            return null;
        }
        let jsonPart = str.substring(startIndex);

        // Replace escaped newlines and real newlines to clean up the JSON string
        let sanitizedStr = jsonPart
            .replace(/\\n/g, "")
            .replace(/\n/g, " ")
            .replace(/\s*:\s*/g, ":") // Normalize colons
            .replace(/\s*,\s*/g, ",") // Normalize commas
            .replace(/\s*{\s*/g, "{")
            .replace(/\s*}\s*/g, "}")
            .replace(/\s*\[\s*/g, "[")
            .replace(/\s*\]\s*/g, "]")
            .replace(/'/g, '"') // Convert all single quotes to double quotes
            .replace(/([{,]\s*)([^"\s][\w]+\s*):/g, '$1"$2":') // Properly quote keys
            .replace(/(["}\]])(\s*["{])/g, '$1,$2') // Insert missing commas
            .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas

        // console.log("Sanitized JSON:", sanitizedStr);

        try {
            // Try parsing again
            return JSON.parse(sanitizedStr);
        } catch (finalError) {
            // console.error("Final error parsing sanitized JSON:", finalError);
            return null;
        }
    }
};











export { getParsedJSON };
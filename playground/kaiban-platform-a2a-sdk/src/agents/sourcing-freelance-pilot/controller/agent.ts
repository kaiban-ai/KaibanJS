/**
 * @fileoverview KaibanJS Team for Pilot Sourcing A2A Agent
 *
 * This module defines the KaibanJS team that processes pilot sourcing requests.
 * The team uses a unified workflow with three tasks:
 * 1. Extract Parameters and Filters - Extracts excelUrl, flightRequest, specialRules, and filtering parameters
 * 2. Process Candidates - Downloads Excel, filters pilots, and calculates qualification scores
 * 3. Create Messages Template - Generates message templates for each candidate
 *
 * @module agents/sourcing-freelance-pilot/controller/agent
 */

import { Agent, Task, Team } from 'kaibanjs';
import { z } from 'zod';
import * as XLSX from 'xlsx';

// Type definitions
interface ExcelDownloadToolInput {
  excelUrl: string;
  filters?: {
    aircraftType?: string;
    pilotRole?: string;
    tailNumber?: string;
    flightType?: string;
    sanMarinoValidation?: boolean;
    licenseType?: string;
    usaVisa?: boolean;
    gender?: string;
  };
}

interface PilotData {
  code: string;
  name: string;
  gender: string;
  aircraft: string;
  function: string;
  phone?: string;
  email?: string;
  sanMarinoValidation?: string;
  licence?: string;
}

// ============================================================================
// TOOL: Excel Download Tool
// ============================================================================

class ExcelDownloadTool {
  name = 'excel_download';
  description =
    'Downloads and filters pilot data from Excel files accessible via URL';
  schema = z.object({
    excelUrl: z
      .string()
      .url()
      .describe(
        'Public URL of the Excel file to download. Must be accessible via HTTP/HTTPS.'
      ),
    filters: z
      .object({
        aircraftType: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? '')
          .describe(
            'Filter pilots by aircraft type. Only use if specific aircraft is mentioned in the flight request.'
          ),
        pilotRole: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? '')
          .describe(
            'Filter pilots by role (CDR/SIC/ISP/COPI). Only use if pilot role is explicitly mentioned in the flight request.'
          ),
        tailNumber: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? '')
          .describe(
            'Filter by specific tail number (aircraft registration). Only use if tail number is explicitly mentioned in the flight request.'
          ),
        flightType: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? '')
          .describe(
            'Filter by flight type (commercial/private). Only use if flight type is explicitly mentioned in the flight request.'
          ),
        sanMarinoValidation: z
          .boolean()
          .nullish()
          .transform((val: boolean | null | undefined) => val ?? false)
          .describe(
            'Filter by San Marino validation requirement. Only use if explicitly required by flight request.'
          ),
        licenseType: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? '')
          .describe(
            'Filter by license type (EASA, FAA, or other license types). Only use if explicitly required by special rules for the flight request.'
          ),
        usaVisa: z
          .boolean()
          .nullish()
          .transform((val: boolean | null | undefined) => val ?? false)
          .describe(
            'Filter by USA visa requirement. Only use if route clearly involves USA operations.'
          ),
        gender: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? '')
          .describe(
            'Filter by pilot gender (Male/Female). Only use if gender is explicitly mentioned in the flight request.'
          ),
      })
      .optional()
      .describe(
        'Optional filtering parameters. Only include parameters that are explicitly mentioned in the flight request or required by special rules.'
      ),
  });

  async invoke(input: ExcelDownloadToolInput) {
    const { excelUrl, filters = {} } = input;

    console.log('ExcelDownloadTool invoke', excelUrl, { filters });

    try {
      // Download Excel file
      const response = await fetch(excelUrl);
      if (!response.ok) {
        console.log('Error download excel');

        return JSON.stringify({
          status: 'ERROR',
          message: `Failed to download Excel file: ${response.statusText}`,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      // Get the first sheet (Pilots sheet)
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return JSON.stringify({
          status: 'ERROR',
          message: 'Excel file has no sheets',
        });
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return JSON.stringify({
          status: 'ERROR',
          message: 'Excel file sheet is invalid',
        });
      }

      // Convert to JSON (same pattern as pilotStore.ts)
      const excelRows = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        raw: false,
      }) as Record<string, unknown>[];

      // Convert Excel data to PilotData format (same pattern as pilotStore.ts)
      const pilots: PilotData[] = excelRows.map((row) => ({
        code: String(row['Code'] || ''),
        name: String(row['Name'] || ''),
        gender: String(row['Gender'] || 'Male'),
        aircraft: String(row['Aircraft'] || ''),
        function: String(row['Function'] || ''),
        phone: row['Phone'] ? String(row['Phone']) : undefined,
        email: row['Email'] ? String(row['Email']) : undefined,
        sanMarinoValidation: row['San Marino Validation']
          ? String(row['San Marino Validation'])
          : undefined,
        licence: row['Licence'] ? String(row['Licence']) : undefined,
      }));

      // Apply filters to pilots
      const filteredPilots = pilots.filter((pilot) => {
        // Aircraft type filter
        if (filters.aircraftType) {
          const aircraftMatch = pilot.aircraft
            .toLowerCase()
            .includes(filters.aircraftType!.toLowerCase());
          if (!aircraftMatch) return false;
        }

        // Pilot role filter
        if (filters.pilotRole) {
          const roleMatch = pilot.function
            .toUpperCase()
            .includes(filters.pilotRole.toUpperCase());
          if (!roleMatch) return false;
        }

        // San Marino validation filter
        if (filters.sanMarinoValidation === true) {
          if (
            !pilot.sanMarinoValidation ||
            pilot.sanMarinoValidation.toUpperCase() !== 'YES'
          ) {
            return false;
          }
        }

        // License type filter
        if (filters.licenseType) {
          if (
            !pilot.licence ||
            !pilot.licence
              .toUpperCase()
              .includes(filters.licenseType.toUpperCase())
          ) {
            return false;
          }
        }

        // USA visa filter (for demo, assume all pilots have visas)
        if (filters.usaVisa === true) {
          // In real implementation, check pilot.visaB1B2 and pilot.visaC1D
          // For now, assume all pilots have required visas
        }

        // Gender filter
        if (filters.gender) {
          const genderMatch = pilot.gender
            .toLowerCase()
            .includes(filters.gender.toLowerCase());
          if (!genderMatch) return false;
        }

        return true;
      });

      console.log('Filtered pilots:', filteredPilots);

      return JSON.stringify({
        status: 'SUCCESS',
        qualifiedPilots: filteredPilots,
        filters,
        totalPilots: pilots.length,
        qualifiedPilotsTotal: filteredPilots.length,
      });
    } catch (error) {
      return JSON.stringify({
        status: 'ERROR',
        message: `Error downloading and filtering Excel data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }
}

// ============================================================================
// TASK 1: Extract Parameters and Filters
// ============================================================================

const textExtractionAgent = new Agent({
  name: 'Text Extraction Agent',
  role: 'Data Extraction Specialist',
  goal: 'Extract Excel URL, flight request, special rules, and filtering parameters from user text input',
  background:
    'Expert in natural language processing and data extraction. Specializes in identifying URLs, flight requirements, and regulatory rules from unstructured text.',
});

const extractParamsAndFiltersTask = new Task({
  title: 'extract_params_and_filters',
  description: `Extract the following information from the user's text {userMessage}:

OBJECTIVE: Extract Excel URL, flight request, special rules, and ALL filtering parameters in a single pass.

PHASE 1: Basic Information Extraction
- Excel file URL (must be a publicly accessible URL ending in .xlsx or .xls)
- Flight request text (complete flight requirements description)
- Special rules text (regulatory requirements, if mentioned)

PHASE 2: Filtering Parameters Extraction from Flight Request
Analyze the flight request to extract filtering parameters. Use the same logic as the proven system:

FLEXIBLE FILTERING APPROACH:
- ONLY extract parameters that are EXPLICITLY mentioned in Flight Request
- DO NOT infer or assume any parameters not clearly stated
- All parameters are optional - only pass what is explicitly available
- Use Special Rules to determine regulatory requirements when applicable if it is mentioned in the flight request

PARAMETER EXTRACTION RULES:
- pilotRole: ONLY if explicitly mentioned in Flight Request (CDR/SIC/ISP/COPI)
- gender: ONLY if gender is explicitly mentioned
- aircraftType: ONLY if specific aircraft is mentioned in Flight Request
- licenseType: ONLY if specific license type is mentioned in Flight Request
- sanMarinoValidation: ONLY true if explicitly mentioned in Flight Request. If not mentioned, set to false or do not pass it.
- usaVisa: ONLY if route clearly involves USA operations
- tailNumber: ONLY if tail number is explicitly mentioned
- flightType: ONLY if flight type (commercial/private) is explicitly mentioned

REGULATORY RULES APPLICATION:
- Apply Special Rules ONLY when they explicitly match the flight request
- Use standard aviation logic to determine when rules apply if it is mentioned in the flight request
- Do not assume requirements not explicitly stated

AIRCRAFT TYPES:
Use the following hardcoded aircraft types mapping:
- T7-ABC: GLEX - Global Express XRS (BD-700)
- OE-AAA: Cessna Citation M2

CRITICAL: Extract ALL filtering parameters in this task so the next task can directly use them without re-analysis.`,
  agent: textExtractionAgent,
  expectedOutput:
    'Structured data containing Excel URL, flight request, special rules, filtering parameters, and aircraft types',
  outputSchema: z.object({
    excelUrl: z
      .string()
      .url()
      .describe('Public URL of the Excel file to download'),
    flightRequest: z.string().describe('Complete flight request text'),
    specialRules: z
      .string()
      .optional()
      .describe('Special rules text if mentioned, otherwise empty string'),
    filters: z
      .object({
        aircraftType: z.enum([
          'GLEX - Global Express XRS (BD-700)',
          'Cessna Citation M2',
        ]),
        pilotRole: z.string().optional(),
        tailNumber: z.string().optional(),
        flightType: z.string().optional(),
        sanMarinoValidation: z.boolean().optional(),
        licenseType: z.string().optional(),
        usaVisa: z.boolean().optional(),
        gender: z.string().optional(),
      })
      .optional()
      .describe(
        'Filtering parameters extracted from flight request and special rules'
      ),
    aircraftTypes: z
      .array(
        z.object({
          aircraftRegistration: z.string(),
          aircraftType: z.string(),
        })
      )
      .describe('Hardcoded aircraft types mapping'),
  }),
});

// ============================================================================
// TASK 2: Process Candidates
// ============================================================================

const pilotQualificationAgent = new Agent({
  name: 'Pilot Qualification Agent',
  role: 'Aviation Operations Specialist',
  goal: 'Download Excel, filter pilots, and calculate qualification scores based on flight requirements and regulatory compliance.',
  background:
    'Expert aviation operations specialist with deep knowledge of pilot certifications, aircraft type ratings, regulatory requirements, and business aviation operations. Specializes in matching pilot qualifications with specific flight requirements and regulatory compliance.',
  // @ts-expect-error - tools is not typed
  tools: [new ExcelDownloadTool()],
});

const processCandidatesTask = new Task({
  title: 'process_candidates',
  description: `Download Excel file, filter pilots using provided filters, and calculate qualification scores.

OBJECTIVE: Process candidate pilots from Excel data using filters already extracted in the previous task.

INPUT DATA FROM PREVIOUS TASK:
- excelUrl: URL to download Excel file
- flightRequest: Complete flight request text
- specialRules: Special rules text (if provided)
- filters: Filtering parameters already extracted
- aircraftTypes: Aircraft types mapping

PHASE 1: Excel Download and Parsing
- Use excel_download tool with {excelUrl} and {filters} from previous task
- Tool will download Excel, parse "Pilots" sheet, and apply filters
- Receive filtered pilot list

PHASE 2: Qualification Scoring
For each filtered pilot, calculate qualification score (1-10):
- Perfect match = 10: Exact aircraft type, role, and all requirements match
- Exact type = 9-8: Exact aircraft type match, minor differences in other criteria
- Similar category = 7-6: Similar aircraft category, most requirements match
- General = 5-4: General match, some requirements met
- Basic = 3-1: Basic qualification, minimal requirements met

Generate qualification reasons for each pilot:
- Aircraft rating match
- License compliance
- Regulatory validation (San Marino, visa, etc.)
- Experience level
- Role suitability

PHASE 3: Metadata Addition
- Add qualificationScore (1-10)
- Add qualificationReasons (array of strings)
- Set processingStatus: 'initial'
- Generate candidateSetId: "candidate-pilots_{timestamp}"
- Set generatedAt: ISO timestamp
- Set totalCandidates: number of qualified pilots
- Include flightRequest from previous task for message templates
- Include specialRules from previous task for message templates

OUTPUT FORMAT REQUIREMENTS:
- For optional fields (phone, email, sanMarinoValidation, licence): 
  * If data is available in Excel, use the actual value
  * If data is NOT available, use empty string "" (NOT null or undefined)
  * NEVER return null for optional string fields
  * Only include fields that have actual data from the Excel file

CRITICAL: Only work with existing Excel data. Do not invent pilot data. Use only explicitly available information.`,
  agent: pilotQualificationAgent,
  expectedOutput:
    'Qualified candidate pilots with aviation-informed qualification scores and complete processing metadata',
  outputSchema: z.object({
    candidates: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        gender: z.string(),
        aircraft: z.string(),
        function: z.string(),
        phone: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? ''),
        email: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? ''),
        sanMarinoValidation: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? ''),
        licence: z
          .string()
          .nullish()
          .transform((val: string | null | undefined) => val ?? ''),
        qualificationScore: z.number(),
        qualificationReasons: z.array(z.string()),
        processingStatus: z.enum([
          'initial',
          'message_sent',
          'response_received',
          'completed',
        ]),
      })
    ),
    selectionJustification: z.string(),
    totalPilotsFound: z.number(),
    totalPilotsQualified: z.number(),
    candidateSetId: z.string(),
    generatedAt: z.string(),
    totalCandidates: z.number(),
    flightRequest: z
      .string()
      .describe('Flight request text for message templates'),
    specialRules: z
      .string()
      .optional()
      .describe('Special rules text for message templates'),
  }),
});

// ============================================================================
// TASK 3: Create Messages Template
// ============================================================================

const messageTemplateAgent = new Agent({
  name: 'Message Template Agent',
  role: 'Communication Specialist',
  goal: 'Generate professional message templates for each qualified candidate pilot based on flight request and special rules.',
  background:
    'Professional communication specialist with expertise in aviation industry communications and pilot relations. Specializes in creating personalized, professional message templates for pilot outreach.',
});

const createMessagesTemplateTask = new Task({
  title: 'create_messages_template',
  description: `Generate message templates for each qualified candidate pilot.

OBJECTIVE: Create personalized message templates for each candidate using ONLY available data from inputs.

MESSAGE CREATION - USE ONLY AVAILABLE DATA:
- Extract flight details from {flightRequest}: dates, times, route, aircraft type
- Use candidate pilot data for personalization
- Apply {specialRules} for regulatory requirements
- Create professional aviation message using ONLY data from inputs:
  * Pilot name: Use from candidate.name
  * Flight details: Extract from {flightRequest} (dates, times, route, aircraft)
  * Pilot role: Use from candidate.function
  * Aircraft type: Use from candidate.aircraft or extract from {flightRequest}
  * Regulatory requirements: Apply from {specialRules}
  * DO NOT add deadlines, contact names, or positions not in the data
  * DO NOT hardcode any information not available in inputs

OUTPUT FORMAT:
Generate a comprehensive text output (not structured JSON) that includes:
1. Summary of qualified candidates (total count, top candidates by score)
2. For each candidate:
   - Pilot name and code
   - Qualification score and reasons
   - Personalized message template ready to send
   - Key qualifications highlighted

CRITICAL REQUIREMENTS:
- ONLY use data available in {candidates}, {flightRequest}, and {specialRules}
- DO NOT add information not present in the inputs
- DO NOT use placeholders or hardcoded data
- Create complete messages using only available information
- Format as readable text, not structured data`,
  agent: messageTemplateAgent,
  expectedOutput:
    'Comprehensive text output with candidate summaries and personalized message templates for each pilot',
});

// ============================================================================
// TEAM CREATION
// ============================================================================

/**
 * Create and export the Pilot Sourcing Team
 * The team processes user messages to extract parameters, download Excel,
 * filter pilots, calculate scores, and generate message templates.
 */
export const createPilotSourcingTeam = (userMessage: string) => {
  return new Team({
    name: 'Pilot Sourcing Team',
    agents: [
      textExtractionAgent,
      pilotQualificationAgent,
      messageTemplateAgent,
    ],
    tasks: [
      extractParamsAndFiltersTask,
      processCandidatesTask,
      createMessagesTemplateTask,
    ],
    inputs: {
      userMessage,
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

/**
 * Process pilot sourcing request
 * This function creates the team, executes it, and returns the result as a string
 */
export const processPilotSourcingRequest = async (userMessage: string) => {
  const team = createPilotSourcingTeam(userMessage);
  const { result = '' } = await team.start();

  console.log({ result });

  // The result should contain the output from the workflow
  if (result && typeof result === 'object') {
    return JSON.stringify(result);
  }

  return result as string;
};

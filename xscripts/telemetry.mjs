/**
 * Telemetry Utility Module
 * 
 * This module integrates TelemetryDeck to help improve our project by:
 * 
 * 1. Identifying and diagnosing technical issues more efficiently
 * 2. Measuring the performance of different parts of the application
 * 3. Guiding our efforts in optimizing and enhancing the codebase
 * 
 * We strictly limit data collection to anonymous, non-personal information
 * such as error occurrences and performance metrics. This approach allows
 * us to make informed decisions for improving the project's stability and
 * performance without compromising privacy.
 * 
 * Users can opt out of telemetry by setting the KAIBAN_TELEMETRY_OPT_OUT
 * environment variable to any value.
 */

import TelemetryDeck from '@telemetrydeck/sdk';
import crypto from 'crypto';
import path from 'path';

let tdInstance = null;

console.log('Initializing telemetry');

// Mock telemetry instance for when users opt out
const mockTelemetry = {
  signal: () => {}, // No-op function
  // Add other methods as needed to match TelemetryDeck's interface
};

function generateProjectId() {
  const projectName = path.basename(process.cwd());
  const userHome = process.env.HOME || process.env.USERPROFILE || '';
  const machineId = crypto.createHash('md5').update(userHome).digest('hex');
  const uniqueString = `${projectName}-${machineId}`;
  
  return crypto.createHash('md5').update(uniqueString).digest('hex');
}

export function initializeTelemetry(appID = '95BF7A3E-9D86-432D-9633-3526DD3A8977') {
  if (process.env.KAIBAN_TELEMETRY_OPT_OUT) {
    console.log('Telemetry is disabled due to KAIBAN_TELEMETRY_OPT_OUT environment variable.');
    tdInstance = mockTelemetry;
  } else if (!tdInstance) {
    const projectId = generateProjectId();
    // console.log(`Generated project ID: ${projectId}`);
    
    tdInstance = new TelemetryDeck({
      appID,
      clientUser: projectId,
    });
  }
  return tdInstance;
}

export function getTelemetryInstance() {
  if (!tdInstance) {
    return initializeTelemetry();
  }
  return tdInstance;
}

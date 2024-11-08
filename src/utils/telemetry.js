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
import { v4 as uuidv4 } from 'uuid';

let tdInstance = null;
const CLIENT_USER = uuidv4();

// Mock telemetry instance for when users opt out
const mockTelemetry = {
  signal: () => {}, // No-op function
  // Add other methods as needed
};

function getSubtleCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment
    return window.crypto.subtle;
  } else if (typeof global !== 'undefined' && global.crypto && global.crypto.subtle) {
    // Node.js environment
    return global.crypto.subtle;
  } else {
    // Fallback for older Node.js versions
    try {
      const crypto = require('crypto');
      if (crypto.webcrypto && crypto.webcrypto.subtle) {
        return crypto.webcrypto.subtle;
      }
    } catch {
      // crypto module not available
    }
    console.warn('SubtleCrypto is not available. TelemetryDeck might not function correctly.');
    return null;
  }
}

function isTelemetryOptedOut() {
  if (typeof process !== 'undefined' && process.env) {
    // Node.js environment
    return !!process.env.KAIBAN_TELEMETRY_OPT_OUT;
  } else if (typeof window !== 'undefined') {
    // Browser environment
    // Assuming the opt-out flag is set during build time or through some other mechanism
    return !!window.KAIBAN_TELEMETRY_OPT_OUT;
  }
  return false;
}

export function initializeTelemetry(appID = '15E9347E-9EE5-4971-A8FB-61D91F3EBA12', clientUser = CLIENT_USER) {
  if (isTelemetryOptedOut()) {
    tdInstance = mockTelemetry;
  } else if (!tdInstance) {
    tdInstance = new TelemetryDeck({
      appID,
      clientUser,
      subtleCrypto: getSubtleCrypto(),
    });
  }
  return tdInstance;
}

export function getTelemetryInstance() {
  if (!tdInstance) {
    throw new Error('Telemetry has not been initialized. Call initializeTelemetry first.');
  }
  return tdInstance;
}

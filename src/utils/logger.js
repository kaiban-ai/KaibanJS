import log from 'loglevel';

// Set initial log level
log.setLevel(log.levels.INFO);  // Default to 'info' level

// To set log level dynamically
const setLogLevel = (level) => {
  log.setLevel(log.levels[level.toUpperCase()]);
};

export { log as logger, setLogLevel };

import pino from 'pino';

// Setting up Pino with pino-pretty as a transport
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'HH:MM:ss',  // Custom time format
      ignore: 'pid,hostname',  // Customize what to ignore in logs
      singleLine: true  // Optional: Puts each log message on a single line
    }
  }
});

const setLogLevel = (level) => {
  logger.level = level;
};

export { logger, setLogLevel };
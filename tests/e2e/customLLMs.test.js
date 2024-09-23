import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const openAITeam = require('./examples/teams/llms/openai');

describe('Custom LLMs Instances Workflows', () => {
  describe('Using OpenAI Intance', () => {
    it('initializes the team successfully', async () => {
      const store = openAITeam.useStore();
      expect(store.getState().getCleanedState()).toMatchSnapshot();
    });
  });
});

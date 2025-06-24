import { exampleRunApproach } from './commit-and-run-example';

// Export for use in tests or other modules
export { exampleRunApproach };

// Run the example if this file is executed directly
if (require.main === module) {
  exampleRunApproach();
}

/**
 * Path: KaibanJS/src/stores/index.ts
 * Store Modules Centralization.
 *
 * This file acts as the central export point for state management store modules within the KaibanJS library. 
 * It consolidates the exports of various stores such as agentStore and taskStore, facilitating easier and 
 * more organized access across the library. This centralization supports modular architecture and enhances 
 * maintainability by grouping all store-related exports in one place.
 *
 * Note: The teamStore and workflowStore have been migrated to use manager-based architecture instead of store-based 
 * state management.
 * 
 * For team-related functionality, use TeamManager and TeamComponent instead.
 * For workflow-related functionality, use WorkflowManager and WorkflowComponent instead.
 *
 * Usage:
 * Import store modules from this file to access and manage the application's state related to agents and tasks efficiently. 
 * This setup ensures that updates and changes to store configurations are propagated consistently throughout the application.
 */

// Team functionality has been migrated to manager-based architecture
// For team-related functionality, use:
// import { TeamManager } from '../managers/domain/team/teamManager';
// import { TeamComponent } from '../components/TeamComponent';

// Workflow functionality has been migrated to manager-based architecture
// For workflow-related functionality, use:
// import { WorkflowManager } from '../managers/domain/workflow/workflowManager';
// import { WorkflowComponent } from '../components/WorkflowComponent';

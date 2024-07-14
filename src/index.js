/**
 * Entry Point for the Library.
 *
 * This file serves as the central export hub, making key components available for external use.
 * It facilitates easy access to the primary functionalities provided by the library, ensuring
 * that importing and integrating these components into external applications is straightforward.
 *
 * Exports:
 * - Agent: A class that manages individual agents with specific roles and capabilities.
 * - Task: A class for defining tasks that agents can perform.
 * - Team: A class for managing groups of agents and their tasks.
 *
 * Usage:
 * Import these components directly from the library's entry point to utilize the functionality
 * in external applications and systems.
 */

import { Agent, Task, Team } from './api';

export {
    Agent,
    Task,
    Team
};

# [Feature] Introduce a "Skills" architecture for agents

**Labels:** `enhancement` `feature`

---

## Summary

Introduce a **Skills** layer in KaibanJS so agents can use reusable, domain-specific instructions (e.g. procedures, policies, airline workflows) without overloading the context with many tools. Skills complement the existing **tools** API: tools remain the execution layer; skills provide the “know-how” and when to load which instructions, inspired by [LangChain Deep Agents](https://www.blog.langchain.com/using-skills-with-deep-agents/) and [Anthropic Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills). The roadmap is scaled in two stages: **Stage 1** – skills at agent level (prompt integration, progressive disclosure, examples); **Stage 2** – skills at **team** level (shared skill pool) and an optional **DeepAgent** agent type (LangGraph-based) for planning and subagents.

---

## Context (relevant to this feature)

- **Agents** today are configured with `tools` (LangChain `StructuredTool`). In **ReactChampionAgent**, tools are listed in the **system prompt** (name, description, schema); the model returns JSON with `action`/`actionInput` and the runtime invokes the tool by name. There is **no first-class “Skill”** concept.
- Capabilities are currently expressed via: **tools**, optional **kanban tools** (e.g. `BlockTaskTool`), and **prompt templates**. Adding a dedicated **Skills** abstraction would improve token efficiency (e.g. progressive disclosure: load full skill content only when the agent decides to use it), modularity, and reuse across agents and domain-specific use cases (e.g. airline).

---

## Proposal

1. **Add an optional `skills` (or `skillPaths`) configuration to agents** (e.g. on `BaseAgentParams` / `IAgentParams`), without changing or deprecating the existing `tools` API.
2. **Adopt a standard skill format** (e.g. **SKILL.md** with YAML frontmatter + Markdown body): frontmatter for discovery (name, description); body for instructions loaded when the skill is used.
3. **Integrate skills into the agent prompt** (starting with **ReactChampionAgent**):
   - **Minimal (v1):** Inject a “Available skills” section into the system prompt (name + description, and optionally full body as static text).
   - **Later:** Support **progressive disclosure** (only frontmatter in initial prompt; load full SKILL.md content when the agent indicates it is using that skill).
4. **Scope skills to the agent** in the first iteration.
5. **Stage 2 (scaled):** Add **team-level skills** (shared skill pool) and an optional **DeepAgent** agent type (LangGraph-based) for use cases that need explicit planning and subagents; both are additive and optional.

---

## Benefits

- **Token efficiency:** Avoid putting all skill instructions in context upfront; only metadata (or full content in v1) as needed.
- **Modularity & reuse:** Same skill can be attached to multiple agents; domain skills (e.g. airline policies) stay in one place.
- **Clear separation:** Tools = execution (APIs, search, etc.); Skills = procedures and when to load which instructions.
- **Backward compatible:** Optional `skills` with default `[]`; existing agents and tools behave unchanged.

---

## Implementation outline (scaled stages)

### Stage 1 – Skills at agent level

- **Phase 1 – Minimal:** Define `SkillConfig` (or load from SKILL.md), add `skills?: SkillConfig[]` to agent config, and inject “Available skills” (name + description, and optionally body) into the ReactChampionAgent system prompt. No new agent type required.
- **Phase 2 (optional):** Progressive disclosure: parse agent output for “use skill X” and inject full SKILL.md content only when that skill is activated.
- **Phase 3 (optional):** Example skills (e.g. web research, airline procedure), docs, and optional convention-based loading (e.g. `skills/` folder).

### Stage 2a – Skills at team level (scaled after Stage 1)

- **Phase 4 – Team skills:** Add `skillPaths` or `skills` to `ITeamParams` (and to store/context so agents can see them). Resolution rule: agent skills + team skills (dedupe by name; agent overrides team when conflicting). All agents in the team can use shared skills (e.g. “cancellation policy”, “airline procedures”) without attaching the same skill to each agent. Tests and docs.
- **Deliverable:** Teams can define a shared skill pool; agents receive merged skills (agent + team) when building the prompt.

### Stage 2b – DeepAgent variant (scaled, optional agent type)

- **Phase 5 – Spike & adapter:** Technical spike: integrate `deepagents` (npm) in a branch or separate module; run an agent with `createDeepAgent` and skills (StateBackend or FilesystemBackend). Design an adapter so a “DeepAgent” is exposed as a `BaseAgent` (or a third type in `createAgent`) so the Team can assign tasks to it and reuse the same store/events where applicable.
- **Phase 6 – Go/no-go & implementation:** Decide whether to add a `DeepAgent` or `LangGraphAgent` type to the factory. If go: implement the new agent type (experimental), document it, and ensure it works with `workOnTask` and team execution. If no-go: keep Skills only on ReactChampionAgent and close this track.
- **Deliverable:** Optional third agent type for users who need explicit planning, subagents, and LangGraph features (checkpointing, etc.); existing ReactChampionAgent and WorkflowDrivenAgent remain unchanged.

**Dependencies:** Stage 2a (team skills) builds on Stage 1 (agent skills). Stage 2b (DeepAgent) can be evaluated in parallel once agent-level skills are stable; it does not block team-level skills.

---

## References

- [Using skills with Deep Agents (LangChain)](https://www.blog.langchain.com/using-skills-with-deep-agents/)
- [Anthropic – Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Customize Deep Agents – Skills (LangChain JS)](https://docs.langchain.com/oss/javascript/deepagents/customization#skills)
- [deepagentsjs – example skills](https://github.com/langchain-ai/deepagentsjs/tree/main/examples/skills)
- Internal strategy doc: `out/estrategia-skills-kaibanjs.md` (full analysis and phased plan in Spanish).

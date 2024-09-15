import AgentsBoardDebugger from "../AgentsBoardDebugger";
import "../index.css";
import teamMultiple from "../teams/custom_llms/multiple";
import teamOllama from "../teams/custom_llms/ollama";
import teamCohere from "../teams/custom_llms/cohere";


export default {
    title: "Teams/Custom LLMs Team",
    component: AgentsBoardDebugger,
};

export const withMultiple = {
    args: {
        team: teamMultiple,
        title: "With Multiple LLMs",
    },
};

export const withOllama = {
    args: {
        team: teamOllama,
        title: "With Ollama",
    },
};

export const withCohere = {
    args: {
        team: teamCohere,
        title: "With Cohere",
    },
};

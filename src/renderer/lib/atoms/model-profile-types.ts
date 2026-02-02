// src/renderer/lib/atoms/model-profile-types.ts
// Shared types and constants for model profiles (to avoid circular dependencies)

export type ModelMapping = {
  id: string           // Internal reference ID (e.g., "opus", "sonnet", "haiku")
  displayName: string  // User-facing name (e.g., "Opus", "Sonnet 3.5")
  modelId: string      // Actual model ID sent to API (e.g., "glm-4.7", "claude-3-opus-20240229")
  supportsThinking?: boolean  // Whether this model supports extended thinking
}

export type CustomClaudeConfig = {
  model: string
  token?: string
  baseUrl: string
  defaultOpusModel?: string
  defaultSonnetModel?: string
  defaultHaikuModel?: string
  subagentModel?: string
}

export type ModelProfile = {
  id: string
  name: string
  config: CustomClaudeConfig
  models: ModelMapping[]
  isOffline?: boolean
}

export const OFFLINE_PROFILE: ModelProfile = {
  id: 'offline-ollama',
  name: 'Offline (Ollama)',
  isOffline: true,
  config: {
    model: 'qwen2.5-coder:7b',
    token: 'ollama',
    baseUrl: 'http://localhost:11434',
  },
  models: [
    {
      id: 'default',
      displayName: 'Default',
      modelId: 'qwen2.5-coder:7b',
      supportsThinking: false,
    },
  ],
}


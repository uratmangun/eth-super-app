## ADDED Requirements

### Requirement: Assistant is optimized for five documentation sources
The assistant SHALL prioritize answering questions using the configured documentation sources for 0G, Uniswap, Gensyn, ENS, and KeeperHub.

#### Scenario: Source-first system prompt
- **WHEN** the chat route resolves its default system prompt
- **THEN** the prompt instructs the assistant to prefer the five supported documentation sources over generic template-repository guidance

#### Scenario: Distinguish docs-backed answers from unsupported inference
- **WHEN** the assistant answers a question without enough support from the configured sources
- **THEN** the system prompt guides it to acknowledge that limitation rather than present unsupported claims as sourced facts

### Requirement: Empty-state prompts reflect docs research use cases
The homepage SHALL present suggested prompts and empty-state copy that encourage learning from the five supported documentation ecosystems rather than focusing only on 0G provider mechanics.

#### Scenario: Suggested prompts span multiple sources
- **WHEN** the homepage chat has no conversation messages
- **THEN** the suggested prompts include examples that reference multiple supported documentation ecosystems instead of only 0G-specific prompts

#### Scenario: Empty-state copy frames the app as a docs console
- **WHEN** the homepage chat has no conversation messages
- **THEN** the empty-state title and description position the product as a documentation research console with multi-provider chat support

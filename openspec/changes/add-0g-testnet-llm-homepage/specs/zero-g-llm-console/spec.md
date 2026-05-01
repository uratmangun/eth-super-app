## ADDED Requirements

### Requirement: Homepage presents a 0G LLM console
The homepage SHALL present a light-blue 0G Galileo LLM console instead of the existing AI IDE template clone/deploy promotion.

#### Scenario: Template promo removed
- **WHEN** a user opens the homepage
- **THEN** the page does not show the GitHub clone command, template promo card, repository assistant title, or Podman deployment prompts

#### Scenario: 0G console branding shown
- **WHEN** a user opens the homepage
- **THEN** the page shows 0G Galileo testnet and wallet-signed LLM console messaging

### Requirement: Chatbox remains primary interaction surface
The homepage SHALL keep a chatbox as the primary area where users submit prompts and view LLM responses.

#### Scenario: Initial chat state
- **WHEN** a user opens the homepage before connecting a wallet
- **THEN** the chatbox shows an empty state explaining that wallet connection is required before starting a 0G inference session

#### Scenario: Prompt suggestions shown
- **WHEN** the chatbox has no conversation messages
- **THEN** the page shows 0G-specific suggested prompts related to provider balance, models, or inference readiness

#### Scenario: Prompt input visible
- **WHEN** a user opens the homepage
- **THEN** the prompt input remains visible in the chat console with a send action

### Requirement: Console displays 0G readiness context
The homepage SHALL display wallet, chain, provider/model, and funding readiness states around the chatbox.

#### Scenario: Readiness panels visible
- **WHEN** a user opens the homepage
- **THEN** the page shows separate readiness areas for wallet status, 0G Galileo chain status, and Direct SDK compute status

#### Scenario: Provider pending state
- **WHEN** no Direct SDK provider has been selected or loaded
- **THEN** the chat console shows a provider pending state

#### Scenario: Funding setup state
- **WHEN** provider funding has not been verified
- **THEN** the compute readiness area indicates that provider funds need setup

### Requirement: Homepage handles inference request states
The chat console SHALL show clear loading and error states for 0G inference requests.

#### Scenario: Request loading
- **WHEN** a 0G inference request is in progress
- **THEN** the chat console disables duplicate prompt submission and shows that a response is being generated

#### Scenario: Request error
- **WHEN** a 0G inference request fails
- **THEN** the chat console shows an inline error message without losing the current conversation context

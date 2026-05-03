## MODIFIED Requirements

### Requirement: Homepage presents a 0G LLM console
The homepage SHALL present a light-blue AI research console that still includes 0G provider support, but no longer frames the product solely as a 0G-only LLM console.

#### Scenario: Template promo removed
- **WHEN** a user opens the homepage
- **THEN** the page does not show the GitHub clone command, template promo card, repository assistant title, or Podman deployment prompts

#### Scenario: Multi-provider docs-console branding shown
- **WHEN** a user opens the homepage
- **THEN** the page shows branding and guidance that position the app as a multi-provider AI docs research console rather than a 0G-only console

### Requirement: Chatbox remains primary interaction surface
The homepage SHALL keep a chatbox as the primary area where users submit prompts and view responses, while allowing those prompts to be oriented around the supported documentation sources.

#### Scenario: Initial chat state
- **WHEN** a user opens the homepage before sending a prompt
- **THEN** the chatbox shows an empty state that encourages documentation research across the supported ecosystems

#### Scenario: Prompt suggestions shown
- **WHEN** the chatbox has no conversation messages
- **THEN** the page shows suggested prompts related to the five supported documentation ecosystems and their concepts

#### Scenario: Prompt input visible
- **WHEN** a user opens the homepage
- **THEN** the prompt input remains visible in the chat console with a send action

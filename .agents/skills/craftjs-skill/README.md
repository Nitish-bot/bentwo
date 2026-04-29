# craftjs-skill

Expert assistance and scaffolding capabilities for building, configuring, and extending React applications leveraging the Craft.js framework.

## Installation

You can install this skill locally for your AI assistant using the provided cross-platform activation script. It works with Claude Code, Cursor, Windsurf, VS Code Copilot, and generic agent environments.

```bash
chmod +x ./install.sh
./install.sh
```

Or install it for a specific platform manually:
```bash
./install.sh --platform cursor
```

## Usage

Once installed, simply activate the skill in your environment using the trigger `/craftjs-skill`:
- `/craftjs-skill build a craft.js user component for an Image`
- `/craftjs-skill help me wire up this component to be a droppable canvas`
- `/craftjs-skill how do I edit properties of a selected node?`

## Files
- `SKILL.md`: Main entrypoint acting as the agent prompt.
- `scripts/craft_scaffold.py`: Generator script to create templates for new User Components.
- `references/`: Architectural guidelines and API specific instructions to assist in robust implementations.

# Golem AI Build System with Dynamic Task Creation

Golem is an AI-powered build system that leverages OpenAI to automate various tasks in the development process, such as code generation, refactoring, optimization, and code reviews. This version of Golem introduces dynamic task creation, allowing the system to adapt and generate new targets based on the outcomes of previous targets and the overall goal of the project.

## Features

- Dynamic task creation based on the results of previous tasks and the main objective.
- AI-driven code generation, refactoring, optimization, and code reviews.
- Dependency management and execution for complex build processes.
- Integration with OpenAI for AI chat and context-aware execution.

## Getting Started

### Prerequisites

To use the Golem build system, make sure you have the following software installed:

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

You'll also need an API key for:

- [OpenAI](https://beta.openai.com/signup/)

### Installation

1. Clone the repository:

```
git clone https://github.com/your_username/golem.git
```

2. Install the required packages:

```
npm install
```

3. Create a `.env` file in the project root directory and add your API keys:

```
OPENAI_API_KEY=your_openai_api_key
```

4. Compile the TypeScript code:

```
npm run build
```

## Usage

Create a Golem YAML file in your project directory with tasks, dependencies, and optional dynamic task generation prompts. For example:

```yaml
# my_golem_file.yaml

default:
  dependencies:
    - initial_task

initial_task:
  dependencies: []
  prompt: "Create a Python function that adds two numbers."
  task_generation_prompt: "Based on the outcome of the initial_task, generate new targets to create functions for other arithmetic operations."
```

Run the Golem build system using the following command:

```
npm start -- my_golem_file.yaml
```

The Golem build system will execute the tasks defined in the Golem YAML file, including the dynamic task generation prompts.

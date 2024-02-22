# Cypress End-to-End Testing Demo

This repository contains a demo project showcasing an example of an end-to-end web testing using [Cypress](https://www.cypress.io/), a modern JavaScript testing framework. E2E testing allows you to simulate user interactions with your application to ensure its functionality behaves as expected.

## Getting Started

#### 1. Clone the Repository

```bash
git clone https://github.com/KonstantinxVx/e2e-cypress-demo.git
```
#### 2. Install Dependencies:
```bash
cd cypress-e2e-demo
yarn install
```
#### 3. Open Cypress and Run the Tests:
```bash
yarn cypress:open
```

## Project Structure
The project structure is organized as follows:
- `cypress/e2e`: contains test files;
- `cypress/fixtures`: contains static data used in tests;
- `cypress/plugins`: contains Cypress plugins;
- `cypress/support`: contains support files and custom command for Cypress tests;
- `cypress.config.ts`: cypress configuration file;
- `package.json`: project dependencies and scripts;

## Test Cases
The demo project includes E2E tests for the following scenarios:
- Login functionality;
- Contact request between users functionality;
- Navigation between pages;
- Form submission and validation;
- Interaction with UI elements;

## License
This project is licensed under the [MIT License](https://opensource.org/license/mit).
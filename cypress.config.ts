import { defineConfig } from 'cypress'

export default defineConfig({
  viewportHeight: 768,
  viewportWidth: 1368,
  video: false,
  chromeWebSecurity: false,
  defaultCommandTimeout: 15000,
  requestTimeout: 15000,
  watchForFileChanges: false,
  taskTimeout: 300000,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  waitForAnimations: true,

  env: {
    password: '123qwe123QWE',
    userEmail: 'robot.test',
    englishTeacherListingPageUrl: '/search/bruxelles/cours-d-anglais',
  },

  e2e: {
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js').default(on, config)
    },
    baseUrl: 'https://www.develop.starofservice.be',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    experimentalRunAllSpecs: true,
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
})

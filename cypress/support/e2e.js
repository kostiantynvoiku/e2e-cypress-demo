import './commands'
import 'cypress-real-events/support'

const commands = []
cy.faker = require('faker')
require('@cypress/skip-test/support')

const dayjs = require('dayjs')
require('dayjs/locale/fr')
dayjs.locale(Cypress.env('locale').toLowerCase())
Cypress.dayjs = dayjs

Cypress.on('uncaught:exception', () => {
  // Returning false here prevents Cypress from failing the test
  return false
})

Cypress.on('test:after:run', (attributes) => {
  console.log(
    'Test "%s" has finished in %dms',
    attributes.title,
    attributes.duration
  )
  console.table(commands)
  commands.length = 0
})

Cypress.on('command:start', (c) => {
  commands.push({
    name: c.attributes.name,
    started: +new Date(),
  })
})

Cypress.on('command:end', (c) => {
  const lastCommand = commands[commands.length - 1]

  if (lastCommand.name !== c.attributes.name) {
    throw new Error('Last command is wrong')
  }

  lastCommand.endedAt = +new Date()
  lastCommand.elapsed = lastCommand.endedAt - lastCommand.started
})

Cypress.on('fail', (err) => {
  console.error(err)
  const at = new Date().toISOString()
  err.message = at + '\n' + err.message
  throw err
})

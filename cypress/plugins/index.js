/// <reference types="cypress" />
/**
 * @type {Cypress.PluginConfig}
 */

const mysqlssh = require('mysql-ssh')
const fs = require('fs')
const locales = require('./locales')

export default (on, config) => {
  const baseUrl = config.baseUrl.split('.')
  const domainExt = baseUrl[baseUrl.length - 1]
  let domainLocale

  for (const locale in locales) {
    if (locales[locale].includes(domainExt)) {
      domainLocale = locale
    }
  }

  config.env.stage = 'sandbox'
  config.env.zeusEndpoint = `https://zeus.sandbox.starofservice.com`
  config.env.mercuryEndpoint =
    'https://mercury.sandbox.starofservice.com/graphql'
  config.defaultCommandTimeout = 25000
  config.requestTimeout = 25000
  config.env.countryCode = domainExt === 'com' ? 'fr' : domainExt
  config.env.domainExt = domainExt
  config.env.locale = domainLocale

  on('before:browser:launch', (browser = {}, launchOptions) => {
    const options = launchOptions
    const width = 1920
    const height = 1080

    if (browser.name === 'chrome' && browser.isHeadless) {
      options.args.push(`--window-size=${width},${height}`)
      options.args.push('--force-device-scale-factor=1')
    }
    if (browser.family === 'chromium' && browser.name !== 'electron') {
      options.args.push('--auto-open-devtools-for-tabs')
    }
    if (browser.family === 'firefox') {
      options.args.push('-devtools')
    }
    if (browser.name === 'electron') {
      options.preferences.devTools = true
    }
    return options
  })

  on('task', {
    log(message) {
      console.log(message)
      return null
    },
  })

  on('task', {
    executeSql(sql, ...args) {
      /* EXAMPLE OF USAGE:

        cy.task('executeSql', 'select nom from sos_pro where id=1;').then(
          (result) => {
            cy.log(result)
          })

      */
      return new Promise(async (resolve, reject) => {
        let connection
        const sshConnect = {
          host: 'ssh-proxy.starofservice.com',
          port: 22,
          user: 'cypress',
          privateKey: config.env.privateKey,
        }
        try {
          connection = await mysqlssh.connect(sshConnect, {
            host: config.env.dbHost,
            port: 3306,
            user: config.env.dbUser,
            password: config.env.dbPassword,
            database: 'sosmain_global',
          })
          const result = await connection.promise().query(sql, args)
          mysqlssh.close()
          resolve(result[0] !== undefined ? result[0] : null)
        } catch (err) {
          reject(err)
        }
      })
    },
  })
  return config
}

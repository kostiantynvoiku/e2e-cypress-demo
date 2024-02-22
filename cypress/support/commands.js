import hmacSHA256 from 'crypto-js/hmac-sha256'
import 'async-retry'
import 'cypress-wait-until'
import r from '../fixtures/translations/routes.json'
import login from './selectors/public/login'

const retry = require('async-retry')
const dayjs = require('dayjs')

const COUNTRY_CODE = Cypress.env('countryCode')
const ZEUS = Cypress.env('zeusEndpoint')

const buildHeards = (token, secret, data) => {
  const headers = {
    'User-Agent': 'SOS.ApiRequestTask/1.0',
    'Accept-Country': COUNTRY_CODE,
    Authorization: `SOS-NOID ${token}`,
  }
  if (secret !== undefined) {
    const signature = hmacSHA256(data ? JSON.stringify(data) : '', secret)
    headers.Authorization = `SOS-SIGV1 ${token};${signature}`
  }
  return headers
}

Cypress.Commands.add(
  'isWithinViewport',
  { prevSubject: true },
  async (subject) => {
    await retry(
      async (bail) => {
        try {
          const windowInnerWidth = Cypress.config(`viewportWidth`)
          const windowInnerHeight = Cypress.config(`viewportHeight`)
          const bounding = subject[0].getBoundingClientRect()
          const rightBoundOfWindow = windowInnerWidth
          const bottomBoundOfWindow = windowInnerHeight
          expect(bounding.top).to.be.at.least(0)
          expect(bounding.left).to.be.at.least(0)
          expect(bounding.right).to.be.at.most(rightBoundOfWindow)
          expect(bounding.bottom).to.be.at.most(bottomBoundOfWindow)
        } catch (error) {
          if (error.prototype.name === 'AssertionError') {
            bail(new Error("Element isn't in ViewPort"))
            return {}
          }
        }
        return subject
      },
      {
        retries: 5,
      }
    )
  }
)

Cypress.Commands.add(
  'loginToAPI',
  (
    username = Cypress.env('admin'),
    password = Cypress.env('adminPass')
  ) => {
    return cy.fixture('loginPost.json').then((reqBody) => {
      const body = reqBody
      body.data.attributes.username = username
      body.data.attributes.password = password
      cy.request({
        method: 'POST',
        url: `${ZEUS}/login`,
        headers: {
          'User-Agent': 'SOS.ApiRequestTask/1.0',
          'Accept-Country': COUNTRY_CODE,
        },
        body,
      })
        .should((response) => {
          expect(response.status).to.equal(200)
        })
        .its('body.data')
    })
  }
)

Cypress.Commands.add('getUserByEmail', (proEmail, token) => {
  const proEmailEncoded = encodeURIComponent(proEmail)
  const headers = buildHeards(token)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/users?filter[user.email_address]=${proEmailEncoded}`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body.data.0')
})

Cypress.Commands.add('deactivateUser', (userUUID, token, secret) => {
  return cy.fixture('usersPatch.json').then((reqBody) => {
    const body = reqBody
    body.data.id = userUUID
    const headers = buildHeards(token, secret, body)
    cy.request({
      method: 'PATCH',
      url: `${ZEUS}/users/${userUUID}`,
      headers,
      body,
    })
      .should((response) => {
        expect(response.status).to.equal(200)
      })
      .its('body.data')
  })
})

Cypress.Commands.add('serviceFormList', (token, serviceId) => {
  const headers = buildHeards(token)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/services/${serviceId}/form`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
})

Cypress.Commands.add('usersPost', (email, token) => {
  return cy.fixture('usersPost.json').then((reqBody) => {
    const body = reqBody
    body.data.attributes.first_name = cy.faker.name.firstName()
    body.data.attributes.last_name = cy.faker.name.lastName()
    body.data.attributes.password = Cypress.env('password')
    body.data.attributes.email_address = email
    const headers = buildHeards(token)
    cy.request({
      method: 'POST',
      url: `${ZEUS}/users?meta%5Buser%5D=api_token%2Capi_secret%2Cjwt_token`,
      headers,
      body,
    })
      .should((response) => {
        expect(response.status).to.equal(201)
      })
      .its('body.data')
  })
})

Cypress.Commands.add(
  'requestPost',
  (
    cityId,
    servieID,
    serviceFromId,
    userID,
    token,
    secret,
    fixture = 'requestPost.json'
  ) => {
    return cy.fixture(fixture).then((reqBody) => {
      const body = reqBody
      body.data.relationships.form.data.id = serviceFromId
      body.data.relationships.service.data.id = servieID
      body.data.relationships.city.data.id = cityId
      const headers = buildHeards(token, secret, reqBody)
      cy.request({
        method: 'POST',
        url: `${ZEUS}/customer_profiles/${userID}/requests`,
        headers,
        body,
      })
        .should((response) => {
          expect(response.status).to.equal(201)
        })
        .its('body')
    })
  }
)

Cypress.Commands.add('getEmail', (receiver, title, folder) => {
  cy.log(
    `Looking for e-mail '${title}' sent to '${receiver}' starting from '${dayjs().format(
      'HH:mm:ss DD-MM-YYYY'
    )}'`
  )
  cy.task('gmail:get-messages', {
    options: {
      to: receiver,
      subject: title,
      label: folder,
      wait_time_sec: 20, // Poll interval (in seconds).
      max_wait_time_sec: 300, // Maximum poll time (in seconds), after which we'll giveup.
      include_body: true,
    },
  }).then((emails) => {
    assert.isNotNull(
      emails,
      `Expected to find at least one email with title '${title}' sent to '${receiver}' until '${dayjs().format(
        'HH:mm:ss DD-MM-YYYY'
      )}, but none were found'`
    )
    const body = emails[0].body.html
    return [...body.matchAll('href=[\'"]?([^\'" >]+)', 'g')]
  })
})

Cypress.Commands.add('businessesPost', (cityUuid, token, secret) => {
  return cy.fixture('businessesPost.json').then((reqBody) => {
    const body = reqBody
    body.data.attributes.company_name =
      `${cy.faker.commerce.productName()} ${cy.faker.company.companySuffix()}`.replace(
        /["'’]|\d+/g,
        ''
      )
    body.data.relationships.city.data.id = cityUuid
    const headers = buildHeards(token, secret, body)
    cy.request({
      method: 'POST',
      url: `${ZEUS}/me/businesses`,
      headers,
      body,
    })
      .should((response) => {
        expect(response.status).to.equal(201)
      })
      .its('body.data')
  })
})

Cypress.Commands.add(
  'serviceConfigurationPost',
  (businessUuid, pokemonGoUuid, token, secret, setupStep) => {
    return cy.fixture('serviceConfigurationPost.json').then((reqBody) => {
      const body = reqBody
      body.data.relationships.service.data.id = pokemonGoUuid
      if (setupStep !== undefined) {
        body.data.attributes.setup_step = setupStep
      }
      const headers = buildHeards(token, secret, body)
      cy.request({
        method: 'POST',
        url: `${ZEUS}/pro_profiles/${businessUuid}/service_configurations?include=autobid_config`,
        headers,
        body,
      })
        .should((response) => {
          expect(response.status).to.equal(201)
        })
        .its('body.data')
    })
  }
)

Cypress.Commands.add('serviceFormGet', (pokemonGoUuid, token, secret) => {
  const headers = buildHeards(token, secret)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/services/${pokemonGoUuid}/form`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body.data')
})

Cypress.Commands.add(
  'proFiltersPost',
  (businessUuid, serviceFormUuid, token, secret) => {
    return cy.fixture('proFiltersPost.json').then((reqBody) => {
      const body = reqBody
      body.data.relationships.pro_profile.data.id = businessUuid
      body.data.relationships.service_form.data.id = serviceFormUuid
      const headers = buildHeards(token, secret, body)
      cy.request({
        method: 'POST',
        url: `${ZEUS}/pro_filters`,
        headers,
        body,
      })
        .should((response) => {
          expect(response.status).to.equal(201)
        })
        .its('body.data')
    })
  }
)

Cypress.Commands.add(
  'proBasePricePost',
  (businessUuid, pokemonGoUuid, token, secret) => {
    return cy.fixture('proBasePricePost.json').then((reqBody) => {
      const body = reqBody
      body.data.relationships.pro_profile.data.id = businessUuid
      body.data.relationships.service.data.id = pokemonGoUuid
      const headers = buildHeards(token, secret, body)
      cy.request({
        method: 'POST',
        url: `${ZEUS}/pro_base_price`,
        headers,
        body,
      })
        .should((response) => {
          expect(response.status).to.equal(201)
        })
        .its('body.data')
    })
  }
)

Cypress.Commands.add('citiesList', (token) => {
  const headers = buildHeards(token)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/cities?sort=-population&page[size]=2`,
      headers,
      timeout: 100000,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body.data')
})

Cypress.Commands.add('servicesList', (token, serviceIdentifier) => {
  const headers = buildHeards(token)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/services?filter[identifier]=${serviceIdentifier}`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body')
})

Cypress.Commands.add(
  'createProUser',
  (serviceIdentifier = 'pokemon-go-expert') => {
    // Logging-in to API as an Admin via POST /login
    cy.loginToAPI().then((response) => {
      let cityUuid
      let serviceUuid
      let serviceName
      let serviceFormUuid
      let businessName
      let proId
      let proUuid
      let proFilterUuid
      let proJwtToken
      const date = new Date().toISOString().replace(/[-:\\.]/g, '')
      const proEmail = `${Cypress.env(
        'userEmail'
      )}+cy+pro+${COUNTRY_CODE}+${date}+approve@starofservice.com`.toLowerCase()
      cy.log(`[INFO] Pro e-mail: ${proEmail}`)
      // Creating new user via POST /users
      cy.usersPost(proEmail, response.token).then((responseUsersPost) => {
        proId = responseUsersPost.attributes._internal_id
        proUuid = responseUsersPost.id
        proJwtToken = responseUsersPost.meta.jwt_token
        // Logging-in to API as newly created user via POST /login
        cy.loginToAPI(
          responseUsersPost.attributes.email_address,
          Cypress.env('password')
        ).then((responseLogin) => {
          const authToken = responseLogin.token
          const authSecret = responseLogin.secret
          // Add phone number:
          cy.mePatchPhoneNumber(authToken, authSecret).then((mePatch) => {
            expect(mePatch.data.attributes.has_valid_phone).to.be.true
          })
          // Getting the city with small population via GET /cities
          cy.citiesList(authToken).then((responseCities) => {
            cityUuid = responseCities[0].id
            // Adding the business to Pro user via POST /me/businesses
            cy.businessesPost(cityUuid, authToken, authSecret).then(
              (businessesPostResponse) => {
                const businessUuid = businessesPostResponse.id
                businessName = businessesPostResponse.attributes.company_name
                // Getting Pokemon Go service UUID via GET /services
                cy.servicesList(authToken, serviceIdentifier).then(
                  (responseServices) => {
                    serviceUuid = responseServices.data[0].id
                    serviceName = responseServices.data[0].attributes.name
                    // Configuring service of Pro user via POST /service_configurations
                    cy.serviceConfigurationPost(
                      businessUuid,
                      serviceUuid,
                      authToken,
                      authSecret
                    )
                    // Getting Pokemon Go service form via GET /services/<serviceUuid>/form
                    cy.serviceFormGet(serviceUuid, authToken, authSecret).then(
                      (serviceFormResponse) => {
                        serviceFormUuid = serviceFormResponse.id
                        // Setting filters for Pro user via POST /pro_filters
                        cy.proFiltersPost(
                          businessUuid,
                          serviceFormUuid,
                          authToken,
                          authSecret
                        ).then((proFiltersResponse) => {
                          proFilterUuid = proFiltersResponse.id
                        })
                        // Setting base price for service via POST /pro_base_price
                        cy.proBasePricePost(
                          businessUuid,
                          serviceUuid,
                          authToken,
                          authSecret
                        )
                        cy.serviceConfigurationList(
                          businessUuid,
                          authToken,
                          authSecret
                        ).then((serviceConfigurationListResponse) => {
                          const serviceConfigurationsUuid =
                            serviceConfigurationListResponse[0].id
                          cy.autobidConfigPatch({
                            serviceConfigurationsUuid,
                            token: authToken,
                            secret: authSecret,
                            live: false,
                            turbo: false,
                          })
                        })
                        cy.workScheduleGet(
                          businessUuid,
                          authToken,
                          authSecret
                        ).then((workScheduleResponse) => {
                          const WORK_SCHEDULE_UUID = workScheduleResponse.id
                          cy.workSchedulePost(
                            businessUuid,
                            WORK_SCHEDULE_UUID,
                            authToken,
                            authSecret
                          )
                          return cy.wrap({
                            proEmail,
                            proUuid,
                            proId,
                            cityUuid,
                            serviceUuid: serviceUuid,
                            serviceFormUuid,
                            businessUuid,
                            businessName,
                            serviceName,
                            proFilterUuid,
                            proJwtToken,
                          })
                        })
                      }
                    )
                  }
                )
              }
            )
          })
        })
      })
    })
  }
)

Cypress.Commands.add('serviceConfigurationList', (proUUID, token, secret) => {
  const headers = buildHeards(token, secret)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/pro_profiles/${proUUID}/service_configurations?include=pro_filter`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body.data')
})

Cypress.Commands.add('autobidConfigPatch', (args) => {
  const {
    serviceConfigurationsUuid,
    token,
    secret,
    live,
    turbo,
    is_bookable = false,
  } = args
  return cy.fixture('autobidConfigPatch.json').then((reqBody) => {
    const body = reqBody
    body.data.id = serviceConfigurationsUuid
    body.data.attributes.is_enabled = live
    body.data.attributes.turbo = turbo
    body.data.attributes.is_bookable = is_bookable
    const headers = buildHeards(token, secret, body)
    cy.request({
      method: 'PATCH',
      url: `${ZEUS}/service_configurations/${serviceConfigurationsUuid}/autobid_config`,
      headers,
      body,
    }).should((response) => {
      expect(response.status).to.equal(200)
    })
  })
})

Cypress.Commands.overwrite('log', (subject, message) => cy.task('log', message))

Cypress.Commands.add('workScheduleGet', (proUuid, token, secret) => {
  const headers = buildHeards(token, secret)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/pro_profiles/${proUuid}/work_schedule`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body.data')
})

Cypress.Commands.add(
  'workSchedulePost',
  (proUuid, workScheduleUuid, token, secret) => {
    return cy.fixture('workSchedulePost.json').then((reqBody) => {
      const body = reqBody
      for (
        let i;
        i < body.data.relationships.schedule_time.data.length;
        i += 1
      ) {
        body.data.relationships.schedule_time.data[i].id = workScheduleUuid
      }
      const headers = buildHeards(token, secret, body)
      cy.request({
        method: 'POST',
        url: `${ZEUS}/pro_profiles/${proUuid}/work_schedule`,
        headers,
        body,
      }).should((response) => {
        expect(response.status).to.equal(201)
      })
    })
  }
)

Cypress.Commands.overwriteQuery('contains', function (originalFn, ...args) {
  const re1 = /(<.*?>)|({.*?})/g
  const re2 = /\s{2}|\n/g
  const document = cy.state('document')
  const isNextJs = Boolean(document.getElementById('__next'))

  if (this.hasPreviouslyLinkedCommand()) {
    args[0] = args[0].replaceAll(re1, '').replace(re2, ' ')
  } else {
    if (args.length > 1) {
      if (typeof args[1] === 'object') {
        args[0] = args[0].replaceAll(re1, '').replace(re2, ' ')
        // if isNextJs => use selector #__next:
        if (isNextJs) {
          args.unshift('#__next')
        }
      } else {
        args[1] = args[1].replaceAll(re1, '').replace(re2, ' ')
      }
    } else {
      args[0] = args[0].replaceAll(re1, '').replace(re2, ' ')
      // if isNextJs => use selector #__next:
      if (isNextJs) {
        args.unshift('#__next')
      }
    }
  }

  return originalFn.apply(this, args)
})

Cypress.Commands.add('checkRequestModerationStatus', (requestUuid) => {
  cy.loginToAPI().then((res) => {
    cy.waitUntil(
      () =>
        cy
          .getRequests(requestUuid, res.token, res.secret)
          .then(
            (requestStatus) =>
              requestStatus.data.attributes.moderation_status === 'approved'
          ),
      {
        errorMsg: `Request not moderated: ${requestUuid}`,
        timeout: 180000,
        interval: 2000, // performs the check every 2 sec, default to 200 ms
      }
    )
  })
})


Cypress.Commands.add('createSession', (email) => {
  cy.session(email, () => {
    cy.intercept('POST', '**/login').as('postLogin')
    cy.visit(r['routes.login'])
    cy.get(login.LOGIN_EMAIL).should('be.enabled').type(email, { force: true })
    cy.get(login.LOGIN_PASSWORD)
      .should('be.enabled')
      .type(Cypress.env('password'), { force: true })
    cy.waitUntil(
      () =>
        cy
          .window()
          .then(
            (window) =>
              window.hasOwnProperty('grecaptcha') &&
              window.grecaptcha !== 'undefined'
          ),
      {
        errorMsg: 'grecaptcha is not found in window',
        timeout: 5000,
        interval: 100,
      }
    ).then(() => {
      cy.get(login.LOGIN_SUBMIT).should('be.enabled').click()
      cy.waitUntil(
        () =>
          cy
            .getCookie('Authorization')
            .then((cookie) => Boolean(cookie && cookie.value)),
        {
          errorMsg: 'Authorization cookie is not found',
          timeout: 10000,
          interval: 100,
        }
      )
    })
  })
})

Cypress.Commands.add('requestOtpPost', (token, secret) => {
  cy.fixture('requestOtpPost.json').then((reqBody) => {
    const timeStamp = Math.floor(Date.now() / 1000)
    const phoneNumber = `+672${timeStamp}`
    const body = reqBody
    body.data.attributes.phone = phoneNumber
    const headers = buildHeards(token, secret, reqBody)
    cy.waitUntil(
      () =>
        cy
          .request({
            method: 'POST',
            url: `${ZEUS}/request_login_otp`,
            headers,
            body,
          })
          .then((response) => response.status == 204),
      {
        errorMsg: 'OPT not received',
        timeout: 60000,
        interval: 60000,
      }
    )
    cy.task(
      'executeSql',
      `SELECT code FROM sos_otp_request WHERE phone = '${phoneNumber}' AND created_at BETWEEN CONVERT_TZ(DATE_SUB(NOW(), INTERVAL 1 MINUTE), @@session.time_zone, 'Europe/Paris') AND CONVERT_TZ(NOW(), @@session.time_zone, 'Europe/Paris');`
    ).then((code) => {
      expect(code[0].code).to.have.lengthOf.greaterThan(0)
      return {
        phone: phoneNumber,
        //phoneShort: phoneNumUpd,
        otp: code[0].code,
      }
    })
  })
})

Cypress.Commands.add('loginOtp', (token, secret, phoneNumber, opt) => {
  return cy.fixture('loginOtp.json').then((reqBody) => {
    const body = reqBody
    body.data.attributes.phone = phoneNumber
    body.data.attributes.code = opt
    const headers = buildHeards(token, secret, reqBody)
    cy.request({
      method: 'POST',
      url: `${ZEUS}/login_otp`,
      headers,
      body,
    })
      .should((response) => {
        expect(response.status).to.equal(201)
      })
      .its('body')
  })
})

Cypress.Commands.add('mePatch', (token, secret, ...args) => {
  return cy.fixture('mePatch.json').then((reqBody) => {
    const body = reqBody
    body.data.attributes.otp_code = args[0]
    body.data.relationships = body.data.relationships || {}
    body.data.relationships.otp_request =
      body.data.relationships.otp_request || {}
    body.data.relationships.otp_request.data =
      body.data.relationships.otp_request.data || {}
    body.data.relationships.otp_request.data.id = args[1]
    body.data.relationships.otp_request.data.type = 'otp_request'

    const headers = buildHeards(token, secret, reqBody)
    cy.request({
      method: 'PATCH',
      url: `${ZEUS}/me`,
      headers,
      body,
    })
      .should((response) => {
        expect(response.status).to.equal(200)
      })
      .its('body')
  })
})

Cypress.Commands.add('mePatchPhoneNumber', (token, secret) => {
  return cy.fixture('mePatch.json').then((reqBody) => {
    const body = reqBody
    const timeStamp = Math.floor(Date.now() / 1000)
    const phoneNumber = `+672${timeStamp}`
    body.data.attributes.phone_number = phoneNumber
    const headers = buildHeards(token, secret, reqBody)
    cy.request({
      method: 'PATCH',
      url: `${ZEUS}/me`,
      headers,
      body,
    })
      .should((response) => {
        expect(response.status).to.equal(200)
      })
      .its('body')
  })
})

Cypress.Commands.add('listProProfiles', (requestUuid, token, secret) => {
  const headers = buildHeards(token, secret)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/pro_profiles?filter[request.id]=${requestUuid}`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body.data')
})

Cypress.Commands.add('getRequests', (requestId, token, secret) => {
  const headers = buildHeards(token, secret)
  return cy
    .request({
      method: 'GET',
      url: `${ZEUS}/requests/${requestId}?include=quotes`,
      headers,
    })
    .should((response) => {
      expect(response.status).to.equal(200)
    })
    .its('body')
})

import t from '../../fixtures/translations/translations.json'
import requestOverview from '../../support/selectors/customer/requestOverview'
import messenger from '../../support/selectors/pro/messenger'
import messengerClient from '../../support/selectors/shared/messenger'
import proProfile from '../../support/selectors/booking/proProfile'

const countryCode = Cypress.env('countryCode')
let proList = {}
let proEmail
let serviceUuid
let serviceFormUuid
let cityUuid
let proUuid
let proId
let requestUuid
let jobName
let customerEmail
let customerUuid
let customerToken
let customerSecret

describe('As a Customer, I should be able to contact Pro directly from the Request Overview page', () => {
  before('Create Pro and Customer', () => {
    const createUsers = () => {
      // Create a Pro:
      cy.createProUser('sheep-shearing').then((proData) => {
        proEmail = proData.proEmail
        proList[proEmail] = true
        proUuid = proData.proUuid
        proId = proData.proId
        serviceUuid = proData.serviceUuid
        serviceFormUuid = proData.serviceFormUuid
        cityUuid = proData.cityUuid

        cy.task(
          'executeSql',
          `UPDATE sos_service_x_pro SET matching_score=1 WHERE pro_id = ${proId};`
        ).then((res) => {
          expect(res.affectedRows).to.eq(1)
        })
      })

      // Create a Customer:
      cy.loginToAPI().then((response) => {
        const { token } = response

        // Fetch usersPost data:
        const todayDate = new Date().toISOString().replace(/[-:\\.]/g, '')
        customerEmail = `${Cypress.env(
          'userEmail'
        )}+cy+customer+${countryCode}+${todayDate}+approve@starofservice.com`
        cy.log(`[INFO] Customer e-mail: ${customerEmail}`)
        cy.usersPost(customerEmail, token).then((user) => {
          customerUuid = user.id
          customerToken = user.meta.api_token
          customerSecret = user.meta.api_secret
        })
      })
    }
    let isError = false

    // Run createUsers():
    createUsers()

    // Check the status:
    cy.once('fail', (err) => {
      isError = true
      throw err
    })
    // Retry createUsers() if previous failed:
    if (isError) {
      createUsers()
      isError = false
    }
  })

  beforeEach('Open reuqest overview', () => {
    cy.intercept('POST', `${Cypress.env('zeusEndpoint')}/requests/**`).as(
      'postQuote'
    )
    // Post request:
    cy.requestPost(
      cityUuid,
      serviceUuid,
      serviceFormUuid,
      customerUuid,
      customerToken,
      customerSecret,
      'requestPostSheepShearing.json'
    ).then((requestPostResponse) => {
      requestUuid = requestPostResponse.data.id
      jobName = requestPostResponse.included[0].attributes.job_name_plural
      // Assert Pro returned as eligible for quote request:
      cy.waitUntil(
        () =>
          cy
            .listProProfiles(requestUuid, customerToken, customerSecret)
            .then((res) => res.some((profile) => profile.id === proUuid)),
        {
          errorMsg: `Pro "${proUuid}" not matched to request "${requestUuid}"`,
          timeout: 10000,
          interval: 1000,
        }
      )
      cy.createSession(customerEmail)
      cy.visit(`/request-overview/${requestUuid}`)
      cy.get(requestOverview.REQUEST_DETAILS_BTN)
      cy.contains(
        requestOverview.OPEN_SUPPLY_TAB,
        t['booking_flow_listing_page.hero_banner.search_cta'].replace(
          '{job_name}',
          jobName
        )
      )
        .should('be.visible')
        .click()
      cy.get(`[data-cy*="CI_quoteCard_proId-${proUuid}"]`)
      // Assert request is moderated:
      cy.checkRequestModerationStatus(requestUuid)
    })
  })

  after('Deactivate Pro users', () => {
    if (Object.keys(proList).length > 0) {
      Object.keys(proList).forEach((proEmailAddress) => {
        cy.loginToAPI().then((response) => {
          cy.getUserByEmail(proEmailAddress, response.token)
            .its('id')
            .then((usserUUID) => {
              cy.deactivateUser(usserUUID, response.token, response.secret)
            })
        })
      })
    }
  })

  it('checks page elements and content', () => {
    // Assert Request Overview open state:
    cy.contains(
      requestOverview.OPEN_SUPPLY_TITLE,
      t['request_overview.find_more.title'].replace('{jobNamePlural}', jobName),
      { matchCase: false }
    )
    cy.contains(
      requestOverview.OPEN_SUPPLY_SUBTITLE,
      t['request_overview.find_more.subtitle']
    )
    cy.contains(
      requestOverview.FILTERS_LABEL,
      t['request_overview.filtering.label']
    ).should('be.visible')
    // Supply section:
    cy.get(requestOverview.OPEN_SUPPLY_LIST)
      .find(requestOverview.SEND_MESSAGE)
      .its('length')
      .then((listLen) => {
        // If less than 5 users listed:
        if (listLen < 5) {
          cy.contains(
            requestOverview.FILTER_DISTANCE,
            t['request_overview.filtering.distance.range.zero']
          )
            .should('be.visible')
            .click()
          cy.get(requestOverview.FILTER_DISTANCE_ITEM_50).click()
          cy.contains(requestOverview.FILTER_DISTANCE, '50km').should(
            'be.visible'
          )
        } else {
          // If more than 5 users listed:
          cy.contains(requestOverview.FILTER_DISTANCE, '50km').should(
            'be.visible'
          )
          cy.contains(
            requestOverview.FILTER_DISTANCE,
            t['request_overview.filtering.distance.maximum']
          )
            .should('be.visible')
            .click()
          cy.contains(
            requestOverview.FILTER_DISTANCE_ITEM,
            t['request_overview.filtering.distance.range.zero']
          ).click()
          cy.contains(
            requestOverview.FILTER_DISTANCE,
            t['request_overview.filtering.distance.range.zero']
          )
        }
      })
    // Filter rating:
    cy.contains(
      requestOverview.FILTER_RATING,
      t['request_overview.filtering.avg_rating.all']
    ).should('be.visible')
    // Sorting:
    cy.contains(
      requestOverview.SORTING_LABEL,
      t['request_overview.sorting.label']
    ).should('be.visible')
    cy.contains(
      requestOverview.SORTING,
      t['request_overview.sorting.options.recommended']
    ).should('be.visible')
    cy.contains(
      `[data-cy*="CI_quoteCard_proId-${proUuid}"]`,
      t['request_overview.quote_card.no_availability']
    )
  })

  it('sends a contact request and Pro accepts it', () => {
    // Find Pro on Open Supply:
    cy.get(`[data-cy*="CI_quoteCard_proId-${proUuid}"]`)
      .find(requestOverview.SEND_MESSAGE)
      .contains(t['request_overview.quote_card.send_message'])
      .click()
    // Open contact modal:
    cy.get(requestOverview.CONTACT_MODAL).then((modalContactPro) => {
      cy.wrap(modalContactPro)
        .should('contain.text', t['service_forms.intro_profile.title'])
        .and('contain.text', t['pro_public_profile.prices.contact'])
      cy.wrap(modalContactPro)
        .find('textarea')
        .contains(t['messenger.quick_reply.have_call'])
        .clear()
        .type(cy.faker.lorem.sentence())
      // Submit modal:
      cy.wrap(modalContactPro)
        .contains(t['request_overview.quote_card.send_message'])
        .click({ force: true })
    })
    cy.wait('@postQuote')
      .its('response.body')
      .then((body) => {
        const quoteUuid = body.data.id
        cy.intercept(
          'PATCH',
          `${Cypress.env('zeusEndpoint')}/quotes/${quoteUuid}?**`
        ).as('patchQuote')
        // Submit success modal:
        cy.contains(
          requestOverview.CONTACT_MODAL,
          t[
            'booking_flow_profile_page.question_to_pro.contact_pro_modal.title_success'
          ]
        )
        cy.contains(
          requestOverview.CONTACT_MODAL,
          t['service_forms.similar_pros_popup.request_sent']
        )
        cy.contains(
          requestOverview.CONTACT_MODAL,
          t['common.ui_actions.continue']
        ).click()
        // Switch to Pro session:
        cy.createSession(proEmail)
        cy.visit('/pro/messenger/quote/' + quoteUuid)
        cy.get('[data-cy^="message-"]').should('be.visible')
        // Accept quote request:
        cy.intercept(
          'GET',
          `${Cypress.env('zeusEndpoint')}/quotes/${quoteUuid}?**`
        ).as('getQuote')
        cy.get(messenger.ACCEPT_QUOTE).click()
        cy.wait('@patchQuote').then(() => {
          cy.wait('@getQuote')
            .its('response.body')
            .then((getQuote) => {
              expect(getQuote.data.attributes.is_accepted_by_pro).to.be.true
              expect(getQuote.data.attributes.is_paid).to.be.true
            })
        })
      })
  })

  it('sends a contact request from Pro Profile page and Pro declines it', () => {
    // Open Pro Profile page:
    cy.get(`[data-cy*="CI_quoteCard_proId-${proUuid}"]`)
      .find('[href*="/p/"]')
      .first()
      .invoke('removeAttr', 'target')
      .click()
    cy.get(proProfile.PRO_PROFILE_CONTACT_BTN).should('be.visible').click()

    // Handle client-contact-pro-modal variations:
    cy.window().then((window) => {
      const activationExperienceData = window._growthbook.assigned.get(
        'client-contact-pro-modal'
      )
      const variation = activationExperienceData.result.value
      expect(activationExperienceData.experiment.active).to.be.true
      if (variation === 'A') {
        // A variation:
        cy.get(requestOverview.MODAL_CONTACT_BTN).click()
        cy.wait('@postQuote')
          .its('response.body')
          .then((body) => {
            const quoteUuid = body.data.id
            cy.intercept(
              'PATCH',
              `${Cypress.env('zeusEndpoint')}/quotes/${quoteUuid}?**`
            ).as('patchQuote')
            cy.contains(
              requestOverview.CONTACT_MODAL,
              t[
                'booking_flow_profile_page.question_to_pro.contact_pro_modal.title_success'
              ]
            )
            cy.contains(
              requestOverview.CONTACT_MODAL,
              t['service_forms.similar_pros_popup.request_sent']
            )
            cy.contains(
              requestOverview.CONTACT_MODAL,
              t['common.ui_actions.continue']
            ).click()
            // Switch to Pro session:
            cy.createSession(proEmail)
            cy.visit('/pro/messenger/quote/' + quoteUuid)
            // Decline quote request:
            cy.get(messenger.DECLINE_QUOTE).click()
            cy.intercept(
              'GET',
              `${Cypress.env('zeusEndpoint')}/quotes/${quoteUuid}?**`
            ).as('getQuote')
            cy.contains('div', t['common.ui_actions.decline']).click()
            cy.wait('@patchQuote')
            cy.wait('@getQuote')
              .its('response.body')
              .then((quote) => {
                expect(quote.data.attributes.is_accepted_by_pro).to.be.false
              })
          })
      } else {
        // Baseline variation:
        cy.get(messengerClient.CHAT_QUICK_REPLY_NEXT_STEP)
          .should('be.visible')
          .click()
        cy.wait('@postQuote')
          .its('response.body')
          .then((body) => {
            const quoteUuid = body.data.id
            cy.intercept(
              'PATCH',
              `${Cypress.env('zeusEndpoint')}/quotes/${quoteUuid}?**`
            ).as('patchQuote')
            // Switch to Pro session:
            cy.createSession(proEmail)
            cy.visit('/pro/messenger/quote/' + quoteUuid)
            // Decline quote request:
            cy.get(messenger.DECLINE_QUOTE).click()
            cy.contains('div', t['common.ui_actions.decline']).click()
            cy.intercept(
              'GET',
              `${Cypress.env('zeusEndpoint')}/quotes/${quoteUuid}?**`
            ).as('getQuote')
            cy.wait('@patchQuote')
            cy.wait('@getQuote')
              .its('response.body')
              .then((quote) => {
                expect(quote.data.attributes.is_accepted_by_pro).to.be.false
                expect(quote.data.attributes.is_paid).to.be.false
              })
          })
      }
    })
  })
})
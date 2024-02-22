import t from '../../fixtures/translations/translations.json'
import listing from '../../support/selectors/booking/listing'
import modal from '../../support/selectors/shared/modal'

describe('As a user, I should be able to use search box on Listing page', () => {
  before('Test setup', () => {
    cy.onlyOn(Cypress.env('countryCode') === 'be')
  })

  beforeEach('Open Listing page', () => {
    cy.intercept('GET', '**/pro_profiles?*').as('getProProfiles')
    cy.visit(Cypress.env('englishTeacherListingPageUrl'))
    cy.wait('@getProProfiles')
    cy.get(`${listing.PRO_CARD_LINK} img`)
      .should('be.visible')
      .and((img) => {
        expect(img[0].naturalWidth).to.be.greaterThan(0)
      })
  })

  it('enters service name', () => {
    // Assert service box title:
    cy.contains(t['header.search.service'])
    // Assert service pre-filled:
    cy.get(listing.SERVICE_SEARCH_INPUT).invoke('val').should('not.be.empty')
    cy.contains(t['booking_flow_data.service.english_teacher.plural'])
    // Clear pre-filled service:
    cy.get(listing.SERVICE_SEARCH_INPUT)
      .clear()
      .invoke('val')
      .should('be.empty')
    // Assert suggestion list:
    cy.get(listing.SERVICE_SEARCH_INPUT).type('Psychologie')
    cy.get('.ant-select-dropdown')
      .find('[title="Psychologie"]')
      .should('be.visible')
      .click()
      .should('not.be.visible')
    // Assert service seleted:
    cy.get(listing.SERVICE_SEARCH_INPUT)
      .invoke('val')
      .should('eq', 'Psychologie')
    // Assert service applied to listing:
    cy.get(listing.PRO_SEARCH_SUBMIT).click()
    cy.contains(t['booking_flow_data.service.psychologist.plural'])
  })

  it('enters a date', () => {
    const today = Cypress.dayjs().format('DD MMM YYYY')
    const curMonth = Cypress.dayjs().format('MMMYYYY')
    const nextMoth = Cypress.dayjs().add(1, 'month').format('MMMYYYY')
    const tomorrowTitle = Cypress.dayjs().add(1, 'day').format('YYYY-MM-DD')
    const tomorrow = Cypress.dayjs().add(1, 'day').format('DD MMM YYYY')
    // Assert date box title:
    cy.get(listing.DATE_PICKER)
    // Assert date pre-filled:
    cy.get(`${listing.DATE_PICKER} div input`).invoke('val').should('eq', today)
    // Trigger calendar:
    cy.get(listing.DATE_PICKER).click()
    // Assert date picker opened:
    cy.get(listing.DATE_PICKER_CALENDAR)
      .should('be.visible')
      .find(modal.DATE_PICKER_HEADER)
      // Assert current month:
      .should('have.text', curMonth)
      // Assert next month:
      .parent()
      .find(modal.DATE_PICKER_HEADER_NEXT)
      .click()
    cy.get(modal.DATE_PICKER_HEADER)
      .should('have.text', nextMoth)
      // Assert back to current month:
      .parent()
      .find(modal.DATE_PICKER_HEADER_PREV)
      .click()
      .parent()
      .should('have.text', curMonth)
    // Assert 'today' applied:
    cy.get(modal.DATE_PICKER_TODAY).click().should('not.be.visible')
    cy.get(`${listing.DATE_PICKER} div input`).invoke('val').should('eq', today)
    // Select tomorrow date:
    cy.get(listing.DATE_PICKER).click()
    cy.get(`[title="${tomorrowTitle}"]`).should('be.visible').click()
    cy.get(`${listing.DATE_PICKER} div input`)
      .invoke('val')
      .should('eq', tomorrow)
  })

  it('enters a location', () => {
    // Assert location box title:
    cy.get(listing.CITY_SEARCH)
    // Assert location pre-filled:
    cy.get(listing.CITY_SEARCH_INPUT).invoke('val').should('not.be.empty')
    // Clear pre-filled location:
    cy.get(listing.CITY_SEARCH_INPUT).clear().invoke('val').should('be.empty')
    // Assert suggestion list:
    cy.get(listing.CITY_SEARCH_INPUT).type('1000 Bruxelles')
    cy.get('[title="1000 Bruxelles"]')
      .should('be.visible')
      .click()
      .should('not.be.visible')
    // Assert location seleted:
    cy.get(listing.CITY_SEARCH_INPUT)
      .invoke('val')
      .should('eq', '1000 Bruxelles')
    cy.get(listing.MAIN_SECTION).should('contain.text', 'Bruxelles')
  })
})

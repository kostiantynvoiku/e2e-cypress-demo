import t from '../../fixtures/translations/translations.json'
import listing from '../../support/selectors/booking/listing'

describe('As a user, I should be able to filter Pros on Listing page', () => {
  // Feature is available only on .be domain
  before('Run only on BE', () => {
    cy.onlyOn(Cypress.env('countryCode') === 'be')
  })

  beforeEach('Open Listing page', () => {
    // Open listing page:
    cy.visit(Cypress.env('englishTeacherListingPageUrl'))
    // Assert filters are visible:
    cy.get(listing.FILTERS_PRICE_APPLY).should('be.visible')
    // Assert images are loaded:
    cy.get(`${listing.PRO_CARD_LINK} img`)
      .should('be.visible')
      .and((img) => {
        expect(img[0].naturalWidth).to.be.greaterThan(0)
      })
  })

  it('shows Rating filter expanded by default', () => {
    cy.contains(t['booking_flow_listing_page.filters.rating.title'])
      .parents()
      .find(listing.FILTER_RATING)
      .should('be.visible')
      .find('label input')
      .last()
      .should('not.be.checked')
      .click()
      .should('be.checked')
    // Assert selected filters on title:
    cy.get(listing.SELECTED_FILTERS_RATING).should('be.visible')
    cy.contains(
      listing.EMPTY_LIST_CTA,
      t['booking_flow_listing_page.filters.clear_all']
    )
      .click()
      .should('not.exist')
  })

  it('shows Price filter expanded by default', () => {
    cy.contains(t['booking_flow_listing_page.filters.price.title'])
      .parents()
      .find(listing.FILTERS_PRICE_APPLY)
      .should('be.visible')
    // Clear min price filter and enter 0:
    cy.get(listing.FILTERS_PRICE_MIN).clear().type(0)
    // Clear max price filter and enter 0:
    cy.get(listing.FILTERS_PRICE_MAX).clear().type(0)
    // Submit filter:
    cy.contains(
      listing.FILTERS_PRICE_APPLY,
      t['booking_flow_listing_page.filters.price.apply']
    ).click()
    // Assert selected filters on title:
    cy.get(listing.SELECTED_FILTERS_PRICE).should('be.visible')
    cy.get(listing.EMPTY_LIST_CTA).click().should('not.exist')
  })

  it('shows Appointment Type filter expanded by default', () => {
    cy.contains(
      listing.FILTERS_APPOINTMENT_TYPE,
      t['booking_flow_listing_page.filters.type_of_appointment']
    )
    cy.get(listing.AT_MY_LOCATION_INPUT)
      .should('not.be.checked')
      .click()
      .then(() => {
        cy.get(listing.AT_MY_LOCATION_INPUT).should('be.checked')
      })
    // Assert selected filters on title:
    cy.get(listing.AT_MY_LOCATION_SELECTED)
      .find(listing.FILTERS_APPOINTMENT_TYPE_REMOVE)
      .click()
      .should('not.exist')
  })

  it('shows Time filter expanded by default', () => {
    cy.contains(t['booking_flow_listing_page.filters.time_of_day.title'])
      .parents()
      .find(listing.FILTERS_TIME)
      .should('be.visible')
      .find(listing.FILTERS_TIME_MORNING)
      .click()
      .invoke('attr', 'aria-checked')
      .should('equal', 'true')
    // Assert selected filters on title:
    cy.get(listing.SELECTED_FILTERS_TIME_MORNING).should('be.visible')
  })

  it('shows Accessibilities filter expanded by default', () => {
    cy.contains(
      listing.FILTERS_ACCESSIBILITIES,
      t['booking_flow_listing_page.filters.accessibilities_available']
    )
    cy.get(listing.ACCESSIBILITIES_ELEVATOR)
      .should('not.be.checked')
      .click()
      .then(() => {
        cy.get(listing.ACCESSIBILITIES_ELEVATOR).should('be.checked')
      })
    // Assert selected filters on title:
    cy.get(listing.ACCESSIBILITIES_ELEVATOR_SELECTED).should('be.visible')
  })

  it('shows Languages Spoken filter collapsed by default', () => {
    cy.contains(
      listing.FILTERS_LANGUAGES_SPOKEN,
      t['booking_flow_listing_page.filters.languages_spoken']
    )
      .parents()
      .find(listing.FILTERS_LANGUAGES_SPOKEN)
      .should('be.visible')
    cy.contains(
      listing.FILTERS_LANGUAGES_SPOKEN,
      t['booking_flow_listing_page.filters.languages_spoken']
    )
      .click()
      .parents()
      .find(listing.LANGUAGES_SPOKEN_FRENCH)
      .should('not.be.checked')
      .click({ force: true })
      .should('be.checked')
  })
})

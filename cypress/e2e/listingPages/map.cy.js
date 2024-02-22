import t from '../../fixtures/translations/translations.json'
import listing from '../../support/selectors/booking/listing'
import modal from '../../support/selectors/shared/modal'

describe('As a user, I should be able to enable and disable map view on Listing page', () => {
  before('Open Listing page', () => {
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

  it('enables and disables map view on Listing page', () => {
    // Assert map section is not enabled:
    cy.get(listing.MAP_SECTION).should('not.exist')

    // Assert show_map switcher is OFF:
    cy.get(listing.SHOW_MAP_SECTION)
      .find(modal.SHOW_MAP_SWITCHER)
      .invoke('attr', 'aria-checked')
      .should('eq', 'false')

    // Click show_map:
    cy.contains(
      listing.SHOW_MAP_SECTION,
      t['booking_flow_listing_page.show_map_button']
    ).click()

    // Assert show_map switcher ON:
    cy.get(listing.SHOW_MAP_SECTION)
      .find(modal.SHOW_MAP_SWITCHER)
      .invoke('attr', 'aria-checked')
      .should('eq', 'true')

    // Assert ALERT_PRO_WITHOUT_LOCATION is visible:
    cy.get(listing.ALERT_PRO_WITHOUT_LOCATION)
      .scrollIntoView()
      .contains(
        listing.ALERT_PRO_WITHOUT_LOCATION,
        t['booking_flow_listing_page.pro_without_location_message']
      )

    // Closer the ALERT_PRO_WITHOUT_LOCATION:
    cy.get(listing.ALERT_PRO_WITHOUT_LOCATION).find('button').click()

    // Assert ALERT_PRO_WITHOUT_LOCATION does not exist:
    cy.get(listing.ALERT_PRO_WITHOUT_LOCATION).should('not.exist')

    // Click show_map:
    cy.contains(
      listing.SHOW_MAP_SECTION,
      t['booking_flow_listing_page.show_map_button']
    ).click()

    // Assert map section is not visible:
    cy.get(listing.MAP_SECTION).should('not.exist')

    // Assert show_map switcher is OFF:
    cy.get(listing.SHOW_MAP_SECTION)
      .find(modal.SHOW_MAP_SWITCHER)
      .invoke('attr', 'aria-checked')
      .should('eq', 'false')
  })

  it('redirects to Pro Profile page from the map', () => {
    // Click show_map:
    cy.contains(
      listing.SHOW_MAP_SECTION,
      t['booking_flow_listing_page.show_map_button']
    ).click()

    // Assert Pros on map:
    cy.get(listing.PRO_MARKERS)
    cy.get('[aria-label*="€"]').first().find('img').click({ force: true })
    cy.get(listing.MAP_PRO_CARD)
      .invoke('removeAttr', 'target')
      .as('proCardLink')

    // Assert redirection from pro-card on map:
    cy.get('@proCardLink').then((proCardLink) => {
      cy.wrap(proCardLink)
        .invoke('attr', 'href')
        .then((href) => {
          const UuidInSource = href.match(/(?<=p\/).*(?=\?)/g).join('') // Get userUUID from the href;
          cy.get(proCardLink).click().url().should('contain', UuidInSource)
        })
    })
  })
})

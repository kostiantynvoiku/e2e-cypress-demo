import t from '../../fixtures/translations/translations.json'
import listing from '../../support/selectors/booking/listing'

describe('As a user, I should be able to sort Pros on Listing page', () => {
  before('Open Listing page', () => {
    cy.onlyOn(Cypress.env('countryCode') === 'be')
  })

  beforeEach('Open Listing page', () => {
    cy.visit(Cypress.env('englishTeacherListingPageUrl'))
    cy.get(`${listing.PRO_CARD_LINK} img`)
      .should('be.visible')
      .and((img) => {
        expect(img[0].naturalWidth).to.be.greaterThan(0)
      })
  })

  it('sorts by availability', () => {
    cy.get(listing.SORTING_AVAILABILITY)
      .click()
      .parent()
      .should('have.attr', 'aria-selected', 'true')

    cy.contains(
      listing.SORTING_AVAILABILITY,
      t['booking_flow_listing_page.sorting.tabs.availability.title']
    )
  })

  it('sorts by price ASC', () => {
    // Assert sorting title:
    cy.contains(
      listing.SORTING_PRICE,
      t['booking_flow_listing_page.sorting.tabs.price.title']
    )

    // Assert sorting disabled:
    cy.intercept('GET', '**/pro_profiles?*').as('pro_profiles')
    cy.get(listing.SORTING_PRICE)
      .parent()
      .should('have.attr', 'aria-selected', 'false')
      .click()
      // Assert sorting enabled:
      .should('have.attr', 'aria-selected', 'true')
    cy.wait('@pro_profiles')

    // Get the price data on first Pro Card:
    cy.get(listing.PRO_CARD_LINK)
      .first()
      .find(listing.PRO_CARD_PRICE)
      .invoke('text')
      .then((text) => {
        const price = Number(text.slice(0, text.indexOf(',')))
        cy.wrap(price).as('minPrice')
      })
    // Switch from ASC to DESC sorting:
    cy.contains(
      listing.SORTING_PRICE,
      t['booking_flow_listing_page.sorting.tabs.price.lowest']
    ).click()
    cy.wait('@pro_profiles')

    // Assert DESC sorting:
    cy.contains(
      listing.SORTING_PRICE,
      t['booking_flow_listing_page.sorting.tabs.price.highest']
    )

    // Get the price data on first Pro Card:
    cy.get(listing.PRO_CARD_LINK)
      .first()
      .find('.proCard_price')
      .invoke('text')
      .then((text) => {
        const maxPrice = Number(text.slice(0, text.indexOf(',')))
        // Assert price data changed:
        cy.get('@minPrice').then((minPrice) => {
          expect(maxPrice).to.be.lte(minPrice)
        })
      })
  })

  it('sorts by recommended', () => {
    cy.contains(
      listing.SORTING_RECOMMENDED,
      t['booking_flow_listing_page.sorting.tabs.recommended.title']
    )

    cy.get(listing.SORTING_RECOMMENDED)
      .should('be.visible')
      .parent()
      .should('have.attr', 'aria-selected', 'false')
      .click()
      .should('have.attr', 'aria-selected', 'true')
  })

  it('sorts by rated', () => {
    cy.contains(
      listing.SORTING_RATED,
      t['booking_flow_listing_page.sorting.tabs.rated.title']
    )

    cy.get(listing.SORTING_RATED)
      .should('be.visible')
      .parent()
      .should('have.attr', 'aria-selected', 'false')
      .click()
      .should('have.attr', 'aria-selected', 'true')
  })
})

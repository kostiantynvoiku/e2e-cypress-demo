import t from '../../fixtures/translations/translations.json'
import listing from '../../support/selectors/booking/listing'
import modal from '../../support/selectors/shared/modal'

describe('As a user, I should be able to perform actions over Pro cards on Listing page', () => {
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

  it('hovers over Pro card', () => {
    cy.get(`${listing.PRO_CARD_LINK} article`)
      .first()
      .then((proCard) => {
        cy.wrap(proCard)
          // Assert card background-color:
          .should('have.css', 'background-color', 'rgb(255, 255, 255)')
          // Assert 'view pro' cta is not visible:
          .find('footer button')
          .should('not.be.visible')
        cy.wrap(proCard)
          .realHover()
          // Assert card background-color has changed:
          .get(proCard)
          .should('have.css', 'background-color', 'rgb(245, 249, 255)')
          // Assert 'view pro' cta is visible:
          .find('footer button')
          .should('be.visible')
        cy.contains(
          listing.PRO_CARD_CTA,
          t['booking_flow_favourite_pros_page.pro_card.view_profile_cta']
        )
      })
  })

  it('hovers over Favorite icon', () => {
    cy.get(listing.PRO_CARD_ADD_TO_FAV).first().realHover()
    // Assert tooltip on hover:
    cy.get(modal.ANT_TOOLTIP_OPEN)
    cy.contains(
      listing.PRO_CARD_SAVE_TOOLTIP,
      t['booking_flow_listing_page.mark_pro_favourite.tooltip.save']
    )
  })

  it('adds Pro to Favorites list', () => {
    // Assert Favorites list is empty:
    cy.contains(
      '[role="button"]',
      t['booking_flow_listing_page.filters.favourites']
    ).click()
    cy.get(listing.PRO_CARD_LINK).should('not.exist')
    cy.contains(
      '[role="button"]',
      t['booking_flow_listing_page.filters.all']
    ).click()

    // Back to All filters:
    cy.get(listing.PRO_CARD_ADD_TO_FAV)
      .first()
      .find('svg')
      .first()
      .should('have.css', 'color', 'rgb(20, 29, 31)')
      .parent()
      .click()
      // Assert red color Fav icon :
      .should('have.css', 'color', 'rgb(0, 0, 0)')
    // Assert tooltip text:
    cy.contains(
      listing.PRO_CARD_SAVE_TOOLTIP,
      t['booking_flow_listing_page.mark_pro_favourite.tooltip.saved']
    )

    // Assert Pro on Favorites list:
    cy.contains(
      '[role="button"]',
      t['booking_flow_listing_page.filters.favourites']
    ).click()

    // Remove from Favorites:
    cy.get(listing.PRO_CARD_REMOVE_FROM_SAVED).click()
    cy.get(listing.PRO_CARD_LINK).should('not.exist')
    cy.contains(
      '[role="button"]',
      t['booking_flow_listing_page.filters.all']
    ).click()
  })

  it('redirects to Pro profile page', () => {
    cy.get(listing.PRO_CARD_LINK)
      .first()
      .as('first')
      .invoke('removeAttr', 'target') // Remove 'target' attribute, so new page will not be opened in a new tab;
      .invoke('attr', 'href')
      .as('href')
    cy.get('@first').then((first) => {
      cy.get('@href').then((href) => {
        const UuidInSource = href.match(/(?<=p\/).*(?=\?)/g).join('') // Get userUUID from the href;
        cy.get(first).click().url().should('contain', UuidInSource)
      })
    })
  })
})

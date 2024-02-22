import listing from '../../support/selectors/booking/listing'

describe('As a user, I should see pagination when there are more than 15 Pro cards on listing page', () => {
  before('Open Listing page', () => {
    cy.onlyOn(Cypress.env('countryCode') === 'be')
    cy.intercept('GET', '**/pro_profiles?*').as('getProProfiles')
    cy.visit(Cypress.env('englishTeacherListingPageUrl'))
  })

  it('checks Pro cards pagination', () => {
    cy.wait('@getProProfiles')
      .its('response.body')
      .then((getProProfiles) => {
        if (getProProfiles.meta.total_pages > 1) {
          cy.get(listing.PAGINATION)
        } else {
          cy.get(listing.PAGINATION).should('not.exist')
        }
      })
  })
})

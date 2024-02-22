import t from '../../fixtures/translations/translations.json'
import r from '../../fixtures/translations/routes.json'
import login from '../../support/selectors/public/login'
import chooseAccount from '../../support/selectors/public/chooseAccount'

const date = new Date().toISOString().replace(/[-:\\.]/g, '')
const customerEmail = `${Cypress.env(
  'userEmail'
)}+cy+customer+login+${date}+approve@starofservice.com`
let proEmail
let proUuid
let phoneNumber
let isProActive

describe('As a user, I should be able to log in on website', () => {
  before('Create new Pro and Customer users', () => {
    // Create a Pro user:
    cy.createProUser().then((proData) => {
      proEmail = proData.proEmail
      proUuid = proData.businessUuid
      isProActive = true
    })
    cy.loginToAPI().then((response) => {
      // Create a Customer user:
      cy.usersPost(customerEmail, response.token).then((user) => {
        const customerToken = user.meta.api_token
        const customerSecret = user.meta.api_secret
        // Verify user's phone number:
        cy.requestOtpPost(response.token, response.secret).then((otp) => {
          phoneNumber = otp.phone
          cy.loginOtp(customerToken, customerSecret, phoneNumber, otp.otp).then(
            (loginOtp) => {
              cy.mePatch(
                customerToken,
                customerSecret,
                otp.otp,
                loginOtp.data.id
              ).then((mePatch) => {
                expect(mePatch.data.attributes.has_valid_phone).to.be.true
              })
            }
          )
        })
      })
    })
  })

  beforeEach('Open login page', () => {
    cy.visit(r['routes.login'])
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
    )
  })

  after('Deactivate Pro user', () => {
    // Deactivate user if it is active
    if (isProActive) {
      cy.loginToAPI().then((response) => {
          cy.deactivateUser(proUuid, response.token, response.secret)
      })
    } else {
      cy.log('Nothing to deactivate')
    }
  })

  it('checks the forms and redirections', () => {
    // Check page elements:
    cy.contains(t['login.title'])
    cy.contains(t['login.email_input.label'])
    cy.contains(t['common.ui_labels.password'])
    cy.contains(t['login.remember_me'])
    cy.contains(t['login.forgot_password'])
    cy.contains(t['login.google_recaptcha_link'])
    cy.contains(login.LOGIN_SUBMIT, t['common.ui_actions.continue']).click()

    // Check error state:
    cy.contains(t['common.error_messages.email.is_required'])
    cy.contains(t['common.error_messages.password.empty'])
    const randomEmail = `${Cypress.env(
      'userEmail'
    )}+cy+random+login+${date}@starofservice.com`
    const randomPass = 'wrongPass321'
    cy.get(login.LOGIN_EMAIL)
      .type(randomEmail)
      .then(() => {
        cy.get(login.LOGIN_PASSWORD).type(randomPass)
        cy.contains(login.LOGIN_SUBMIT, t['common.ui_actions.continue']).click()
        cy.contains(t['login.server_error.incorrect_login'])
      })

    // Check show/hide password button:
    cy.get(login.LOGIN_EMAIL_INPUT_SECTION).find('button').click()
    cy.get(login.LOGIN_PASSWORD).invoke('attr', 'type').should('eq', 'text')
    cy.get(login.LOGIN_EMAIL_INPUT_SECTION).find('button').click()
    cy.get(login.LOGIN_PASSWORD).invoke('attr', 'type').should('eq', 'password')

    // Check error message redirection link:
    cy.get(login.LOGIN_ERROR_MESSAGE_RESET_PASSWORD_LINK).click()
    cy.location('pathname').should('eq', '/forgot_password')
    cy.go('back')

    // Check "sign-up as a professional" link redirection:
    cy.contains('a', t['header.links.pro_signup']).click()
    cy.location('pathname').should('eq', '/pro')
    cy.go('back')

    // Check sign-up link (header) redirection:
    cy.contains('a', t['header.links.signup']).click()
    cy.get(chooseAccount.LOGIN_LINK).click()

    // Check forgot password link redirection:
    cy.contains(login.FORGOT_PASSWORD_LINK, t['login.forgot_password']).click()
    cy.location('pathname').should('eq', '/forgot_password')
    cy.go('back')
  })

  it('checks logging in flow with email address as a Pro and a Customer', () => {
    const checkUserLoginRedirection = (email, url) => {
      cy.get(login.LOGIN_EMAIL).type(email)
      cy.get(login.LOGIN_PASSWORD).type(Cypress.env('password'))
      cy.contains(login.LOGIN_SUBMIT, t['common.ui_actions.continue']).click()
      cy.location('pathname').should('eq', url)
    }
    // Check log in for Pro:
    checkUserLoginRedirection(proEmail, '/pro/messenger')
    cy.clearCookies()
    cy.reload()
    // Check log in for Customer:
    checkUserLoginRedirection(customerEmail, '/client/dashboard')
  })

  it('checks logging in flow for a deactivated user', () => {
    // Deactivate user:
    cy.loginToAPI().then((response) => {
      cy.deactivateUser(proUuid, response.token, response.secret)
    })
    isProActive = false
    // Submit user data:
    cy.get(login.LOGIN_EMAIL).type(proEmail)
    cy.get(login.LOGIN_PASSWORD).type(Cypress.env('password'))
    cy.contains(login.LOGIN_SUBMIT, t['common.ui_actions.continue']).click()
    // Expect error:
    cy.contains(t['login.server_error.incorrect_login'])
  })

  it('checks remember me feature', () => {
    cy.intercept('POST', `${Cypress.env('zeusEndpoint')}/login`).as(
      'loginSession'
    )
    cy.get(login.LOGIN_EMAIL).type(customerEmail)
    cy.get(login.LOGIN_PASSWORD).type(Cypress.env('password'))
    cy.get(login.LOGIN_REMEMBER_ME).click()
    cy.contains(login.LOGIN_SUBMIT, t['common.ui_actions.continue']).click()
    // Assert Authorization cookie:
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
    const todayDate = Cypress.dayjs().add(30, 'day').format('YYYY-M-D')
    // Check expiry property:
    cy.getCookie('Authorization')
      .should('have.property', 'expiry')
      .then((expirationCookie) => {
        const dateConvert = new Date(expirationCookie * 1000)
        const expirationDate = `${dateConvert.getFullYear()}-${
          dateConvert.getMonth() + 1
        }-${dateConvert.getDate()}`
        expect(expirationDate).to.eq(todayDate)
      })
  })

  it('checks logging in with phone number as a Customer', () => {
    cy.intercept('POST', `${Cypress.env('zeusEndpoint')}/request_login_otp`).as(
      'requestLoginOtpPost'
    )
    // Open log in with phone number screen:
    cy.contains(
      login.LOGIN_WITH_PHONE,
      t['login.actions.continue_with_phone']
    ).click()
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
    )
    cy.contains(t['common.ui_labels.phone_number'])
    cy.contains(t['phone_verify.phone_filed.hint'])
    cy.get(login.PHONE_INPUT).clear().type(phoneNumber)
    cy.get(login.SUBMIT_PHONE).click()
    // Assert phone verification step:
    cy.wait('@requestLoginOtpPost')
      .its('response.statusCode')
      .then((statusCode) => {
        if (statusCode === 429) {
          cy.wait(40000)
          cy.get(login.SUBMIT_PHONE).click()
        }
      })
    cy.contains(t['phone_verify.title'])
    cy.contains(t['phone_verify.description'])
    cy.contains(t['phone_verify.did_not_get_code'])
    cy.contains(t['phone_verify.resend'])
    cy.contains(t['login.actions.back_to_login'])
    const verificationCode = '000000'.split('')
    cy.get(login.PHONE_CODE_INPUT).each(($el, i) => {
      cy.wrap($el).type(verificationCode[i])
    })
    // Redirection to /client/dashboard:
    cy.location('pathname').should('eq', '/client/dashboard')
  })

  it('starts sign up flow if phone number does not exist in DB', () => {
    cy.intercept('POST', `${Cypress.env('zeusEndpoint')}/request_login_otp`).as(
      'requestLoginOtpPost'
    )
    // Open log in with phone number screen:
    cy.contains(
      login.LOGIN_WITH_PHONE,
      t['login.actions.continue_with_phone']
    ).click()
    const timeStamp = Math.floor(Date.now() / 1000)
    const phoneNb = `+672${timeStamp}`
    cy.get(login.PHONE_INPUT).clear().type(phoneNb)
    cy.get(login.SUBMIT_PHONE).click()
    // Verify phone number:
    cy.wait('@requestLoginOtpPost').its('response.statusCode').should('eq', 204)
    const verificationCode = '000000'.split('')
    cy.get(login.PHONE_CODE_INPUT).each(($el, i) => {
      cy.wrap($el).type(verificationCode[i])
    })
    // Email and password screen:
    cy.contains(t['login.sign_in_sign_up.title'])
    cy.contains(
      t['login.sign_in_sign_up.description'].replace('{phone}', phoneNb)
    )
    cy.contains(t['login.email_input.label'])
    cy.contains(t['common.ui_labels.password_hint'])
    cy.contains(t['login.forgot_password'])
    cy.contains(t['login.actions.change_phone_number'])
    const curDate = new Date().toISOString().replace(/[-:\\.]/g, '')
    const customerEmailNew = `cy+customer+login+${curDate}+approve@starofservice.com`
    cy.get(login.SIGNUP_EMAIL).type(customerEmailNew)
    cy.get(login.SIGNUP_PASSWORD).type(Cypress.env('password'))
    cy.contains(login.SIGNUP_CONTINUE, t['common.ui_actions.continue']).click()

    // Personal data screen:
    cy.contains(t['login.name_step.title'])
    cy.contains(t['login.name_step.description'])
    cy.contains(t['common.ui_labels.first_name'])
    cy.contains(t['common.ui_labels.last_name'])
    cy.contains(t['login.actions.back_to_login'])
    cy.get(login.SIGNUP_FIRST_NAME).type(cy.faker.name.firstName())
    cy.get(login.SIGNUP_LAST_NAME).type(cy.faker.name.lastName())
    cy.intercept('POST', `${Cypress.env('zeusEndpoint')}/users`).as('usersPost')
    cy.contains(
      login.SIGNUP_NAME_CONTINUE,
      t['common.ui_actions.continue']
    ).click()

    // Redirection to /client/dashboard:
    cy.wait('@usersPost').its('response.statusCode').should('eq', 201)
    cy.location('pathname').should('eq', '/client/dashboard')
  })
})

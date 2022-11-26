import { expect } from 'chai'
import { fireEvent, screen, render } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import AccountInfoSection from '../../../../../frontend/js/features/settings/components/account-info-section'
import { UserProvider } from '../../../../../frontend/js/shared/context/user-context'

function renderSectionWithUserProvider() {
  render(<AccountInfoSection />, {
    wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
  })
}

describe('<AccountInfoSection />', function () {
  beforeEach(function () {
    window.metaAttributesCache = window.metaAttributesCache || new Map()
    window.metaAttributesCache.set('ol-user', {
      email: 'sherlock@holmes.co.uk',
      first_name: 'Sherlock',
      last_name: 'Holmes',
    })
    window.metaAttributesCache.set('ol-ExposedSettings', {
      hasAffiliationsFeature: false,
    })
    window.metaAttributesCache.set(
      'ol-isExternalAuthenticationSystemUsed',
      false
    )
    window.metaAttributesCache.set('ol-shouldAllowEditingDetails', true)
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
    fetchMock.reset()
  })

  it('submits all inputs', async function () {
    fetchMock.put('/api/user/settings/email', 200)
    const updateMock = fetchMock.put('/api/user/settings/name', 200)
    renderSectionWithUserProvider()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@watson.co.uk' },
    })
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Watson' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change',
      })
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Update',
      })
    )
    expect(updateMock.called()).to.be.true
    expect(
      JSON.parse(
        updateMock.lastCall('/api/user/settings/email')![1]!.body as string
      )
    ).to.deep.equal({
      email: 'john@watson.co.uk',
    })
    expect(
      JSON.parse(
        updateMock.lastCall('/api/user/settings/name')![1]!.body as string
      )
    ).to.deep.equal({
      first_name: 'John',
      last_name: 'Watson',
    })
  })

  it('disables button on invalid email', async function () {
    const updateMock = fetchMock.put('/api/user/settings/email', 200)
    renderSectionWithUserProvider()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john' },
    })
    const button = screen.getByRole('button', {
      name: 'Change',
    }) as HTMLButtonElement

    expect(button.disabled).to.be.true
    fireEvent.click(button)

    expect(updateMock.called()).to.be.false
  })

  it('shows inflight state and success message', async function () {
    let finishUpdateCall: (value: any) => void = () => {}
    fetchMock.put(
      '/api/user/settings/email',
      new Promise(resolve => (finishUpdateCall = resolve))
    )
    renderSectionWithUserProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change',
      })
    )
    await screen.findByText('Changing…')

    finishUpdateCall(200)
    await screen.findByRole('button', {
      name: 'Change',
    })
    screen.getByText('Thanks, your settings have been updated.')
  })

  it('shows server error', async function () {
    fetchMock.put('/api/user/settings/email', 500)
    renderSectionWithUserProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change',
      })
    )
    await screen.findByText('Something went wrong. Please try again.')
  })

  it('shows invalid error', async function () {
    fetchMock.put('/api/user/settings/email', 400)
    renderSectionWithUserProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change',
      })
    )
    await screen.findByText(
      'Invalid Request. Please correct the data and try again.'
    )
  })

  it('shows conflict error', async function () {
    fetchMock.put('/api/user/settings/email', {
      status: 409,
      body: {
        message: 'This email is already registered',
      },
    })
    renderSectionWithUserProvider()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change',
      })
    )
    await screen.findByText('This email is already registered')
  })

  it('hides email input', async function () {
    window.metaAttributesCache.set('ol-ExposedSettings', {
      hasAffiliationsFeature: true,
    })
    const updateMock = fetchMock.put('/api/user/settings/name', 200)

    renderSectionWithUserProvider()
    expect(screen.queryByLabelText('Email')).to.not.exist

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Update',
      })
    )
    expect(JSON.parse(updateMock.lastCall()![1]!.body as string)).to.deep.equal(
      {
        first_name: 'Sherlock',
        last_name: 'Holmes',
      }
    )
  })

  it('disables email input', async function () {
    window.metaAttributesCache.set(
      'ol-isExternalAuthenticationSystemUsed',
      true
    )
    const updateMock = fetchMock.put('/api/user/settings/name', 200)

    renderSectionWithUserProvider()
    expect(screen.getByLabelText('Email')).to.have.property('readOnly', true)
    expect(screen.getByLabelText('First Name')).to.have.property(
      'readOnly',
      false
    )
    expect(screen.getByLabelText('Last Name')).to.have.property(
      'readOnly',
      false
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Update',
      })
    )
    expect(JSON.parse(updateMock.lastCall()![1]!.body as string)).to.deep.equal(
      {
        first_name: 'Sherlock',
        last_name: 'Holmes',
      }
    )
  })

  it('disables names input', async function () {
    window.metaAttributesCache.set('ol-shouldAllowEditingDetails', false)
    const updateMock = fetchMock.put('/api/user/settings/email', 200)

    renderSectionWithUserProvider()
    expect(screen.getByLabelText('Email')).to.have.property('readOnly', false)
    expect(screen.getByLabelText('First Name')).to.have.property(
      'readOnly',
      true
    )
    expect(screen.getByLabelText('Last Name')).to.have.property(
      'readOnly',
      true
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change',
      })
    )
    expect(JSON.parse(updateMock.lastCall()![1]!.body as string)).to.deep.equal(
      {
        email: 'sherlock@holmes.co.uk',
      }
    )
  })
})

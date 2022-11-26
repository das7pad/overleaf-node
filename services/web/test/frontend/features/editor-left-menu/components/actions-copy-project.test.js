import { fireEvent, screen } from '@testing-library/dom'
import fetchMock from 'fetch-mock'
import sinon from 'sinon'
import { expect } from 'chai'
import ActionsCopyProject from '../../../../../frontend/js/features/editor-left-menu/components/actions-copy-project'
import { renderWithEditorContext } from '../../../helpers/render-with-context'
import { waitFor } from '@testing-library/react'

describe('<ActionsCopyProject />', function () {
  const assignStub = sinon.stub()
  const originalLocation = window.location

  beforeEach(function () {
    Object.defineProperty(window, 'location', {
      value: {
        assign: assignStub,
        href: originalLocation.href,
      },
    })
  })

  afterEach(function () {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
    })
    fetchMock.reset()
  })

  it('shows correct modal when clicked', async function () {
    renderWithEditorContext(<ActionsCopyProject />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy Project' }))

    screen.getByPlaceholderText('New Project Name')
  })

  it('loads the project page when submitted', async function () {
    fetchMock.post('express:/api/project/:id/clone', {
      status: 200,
      body: {
        project_id: 'new-project',
      },
    })

    renderWithEditorContext(<ActionsCopyProject />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy Project' }))

    const input = screen.getByPlaceholderText('New Project Name')
    fireEvent.change(input, { target: { value: 'New Project' } })

    const button = screen.getByRole('button', { name: 'Copy' })
    button.click()

    await waitFor(() => {
      expect(button.textContent).to.equal('Copying…')
    })

    await waitFor(() => {
      expect(assignStub).to.have.been.calledOnceWith('/project/new-project')
    })
  })
})

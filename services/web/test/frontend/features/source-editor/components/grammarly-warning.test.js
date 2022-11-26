import fetchMock from 'fetch-mock'
import { expect } from 'chai'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithEditorContext } from '../../../helpers/render-with-context'
import GrammarlyWarning from '../../../../../frontend/js/features/source-editor/components/grammarly-warning'
import localStorage from '../../../../../frontend/js/infrastructure/local-storage'

describe('<GrammarlyWarning />', function () {
  const grammarlyStub = {
    add() {
      const el = document.createElement('grammarly-desktop-integration')
      document.body.appendChild(el)
    },
    restore() {
      document.querySelector('grammarly-desktop-integration')?.remove()
    },
    returns(v) {
      if (v) {
        this.add()
      } else {
        this.restore()
      }
    },
  }

  before(function () {
    window.metaAttributesCache = new Map()
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
    grammarlyStub.restore()
    fetchMock.reset()
    localStorage.clear()
  })

  it('shows warning when grammarly is available', async function () {
    grammarlyStub.returns(true)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', true)

    renderWithEditorContext(<GrammarlyWarning delay={100} />, {
      scope: {
        editor: {
          newSourceEditor: true,
        },
      },
    })

    await screen.findByText(
      'A browser extension, for example Grammarly, may be slowing down Overleaf.'
    )
    await screen.findByRole('button', { name: 'Close' })
    await screen.findByRole('link', { name: 'Find out how to avoid this' })
  })

  it('does not show warning when grammarly is not available', async function () {
    grammarlyStub.returns(false)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', true)

    renderWithEditorContext(<GrammarlyWarning delay={100} />, {
      scope: {
        editor: {
          newSourceEditor: true,
        },
      },
    })

    await waitFor(() => {
      expect(
        screen.queryByText(
          'A browser extension, for example Grammarly, may be slowing down Overleaf.'
        )
      ).to.not.exist
    })
  })

  it('does not show warning when user has dismissed the warning', async function () {
    grammarlyStub.returns(true)
    localStorage.setItem('editor.has_dismissed_grammarly_warning', true)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', true)

    renderWithEditorContext(<GrammarlyWarning delay={100} />, {
      scope: {
        editor: {
          newSourceEditor: true,
        },
      },
    })

    await waitFor(() => {
      expect(
        screen.queryByText(
          'A browser extension, for example Grammarly, may be slowing down Overleaf.'
        )
      ).to.not.exist
    })
  })

  it('does not show warning when user does not have CM6', async function () {
    grammarlyStub.returns(true)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', false)

    renderWithEditorContext(<GrammarlyWarning delay={100} />)

    await waitFor(() => {
      expect(
        screen.queryByText(
          'A browser extension, for example Grammarly, may be slowing down Overleaf.'
        )
      ).to.not.exist
    })
  })

  it('does not show warning when user have ace as their preference', async function () {
    grammarlyStub.returns(true)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', true)

    renderWithEditorContext(<GrammarlyWarning delay={100} />, {
      scope: {
        editor: {
          newSourceEditor: false,
        },
      },
    })

    await waitFor(() => {
      expect(
        screen.queryByText(
          'A browser extension, for example Grammarly, may be slowing down Overleaf.'
        )
      ).to.not.exist
    })
  })

  it('does not show warning when user have rich text as their preference', async function () {
    grammarlyStub.returns(true)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', true)

    renderWithEditorContext(<GrammarlyWarning delay={100} />, {
      scope: {
        editor: {
          newSourceEditor: true,
          showRichText: true,
        },
      },
    })

    await waitFor(() => {
      expect(
        screen.queryByText(
          'A browser extension, for example Grammarly, may be slowing down Overleaf.'
        )
      ).to.not.exist
    })
  })

  it('hides warning if close button is pressed', async function () {
    grammarlyStub.returns(true)
    window.metaAttributesCache.set('ol-showNewSourceEditorOption', true)

    renderWithEditorContext(<GrammarlyWarning delay={100} />, {
      scope: {
        editor: {
          newSourceEditor: true,
        },
      },
    })

    const warningText =
      'A browser extension, for example Grammarly, may be slowing down Overleaf.'

    await screen.findByText(warningText)

    const hasDismissedGrammarlyWarning = localStorage.getItem(
      'editor.has_dismissed_grammarly_warning'
    )

    expect(hasDismissedGrammarlyWarning).to.equal(null)

    const closeButton = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeButton)

    expect(screen.queryByText(warningText)).to.not.exist

    await waitFor(() => {
      const hasDismissedGrammarlyWarning = localStorage.getItem(
        'editor.has_dismissed_grammarly_warning'
      )

      expect(hasDismissedGrammarlyWarning).to.equal(true)
    })
  })
})

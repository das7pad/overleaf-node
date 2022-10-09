import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useProjectContext } from '../../../shared/context/project-context'
import useAbortController from '../../../shared/hooks/use-abort-controller'

const MAX_FILE_SIZE = 2 * 1024 * 1024

export default function FileViewText({ file, onLoad, onError }) {
  const { _id: projectId } = useProjectContext({
    _id: PropTypes.string.isRequired,
  })

  const { signal } = useAbortController()

  const [textPreview, setTextPreview] = useState('')
  const [shouldShowDots, setShouldShowDots] = useState(false)

  useEffect(() => {
    if (file.size === 0) return onLoad()
    setTextPreview('')
    const headers = new Headers()
    if (file.size > MAX_FILE_SIZE) {
      setShouldShowDots(true)
      headers.set('Range', `bytes=0-${MAX_FILE_SIZE}`)
    } else {
      setShouldShowDots(false)
    }
    fetch(`/api/project/${projectId}/file/${file.id}`, { signal, headers })
      .then(response => {
        if (!response.ok) {
          throw new Error('Loading preview failed')
        }
        return response.text().then(text => {
          if (file.size > MAX_FILE_SIZE) {
            text = text.replace(/\n.*$/, '')
          }
          setTextPreview(text)
          onLoad()
        })
      })
      .catch(err => {
        onError(err)
      })
  }, [projectId, file, onError, onLoad, signal])

  if (file.size === 0) {
    return <>This file is empty and does not have a preview.</>
  }
  if (!textPreview) return null
  return (
    <div className="text-preview">
      <div className="scroll-container">
        <p>{textPreview}</p>
        {shouldShowDots && <p>...</p>}
      </div>
    </div>
  )
}

FileViewText.propTypes = {
  file: PropTypes.shape({ id: PropTypes.string, size: PropTypes.number })
    .isRequired,
  onLoad: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
}

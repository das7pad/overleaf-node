import { useEffect, useState } from 'react'
import { postJSON } from '../../../infrastructure/fetch-json'
import { fileCollator } from '../util/file-collator'
import useAbortController from '../../../shared/hooks/use-abort-controller'

const alphabetical = (a, b) => fileCollator.compare(a.path, b.path)

export function useProjectOutputFiles(projectId) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  const { signal } = useAbortController()

  useEffect(() => {
    if (projectId) {
      setLoading(true)
      setError(false)
      setData(null)

      postJSON(`/api/project/${projectId}/compile/headless`, { signal })
        .then(data => {
          if (data.status === 'success') {
            const filteredFiles = data.outputFiles.filter(file =>
              file.path.match(/.*\.(pdf|png|jpeg|jpg|gif)/)
            )
            data.outputFiles.forEach(file => {
              file.clsiServerId = data.clsiServerId
              file.compileGroup = data.compileGroup
            })
            setData(filteredFiles.sort(alphabetical))
          } else {
            setError('linked-project-compile-error')
          }
        })
        .catch(error => setError(error))
        .finally(() => setLoading(false))
    }
  }, [projectId, signal])

  return { loading, data, error }
}

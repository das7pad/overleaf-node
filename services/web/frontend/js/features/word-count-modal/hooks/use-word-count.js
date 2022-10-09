import useAbortController from '../../../shared/hooks/use-abort-controller'
import { fetchWordCount } from '../utils/api'
import { useEffect, useState } from 'react'
import { useProjectContext } from '../../../shared/context/project-context'
import { useIdeContext } from '../../../shared/context/ide-context'
import { useDetachCompileContext as useCompileContext } from '../../../shared/context/detach-compile-context'

export function useWordCount() {
  const { _id: projectId, imageName } = useProjectContext()
  const { clsiServerId } = useCompileContext()
  const { fileTreeManager } = useIdeContext()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState()

  const { signal } = useAbortController()

  useEffect(() => {
    fetchWordCount({
      projectId,
      clsiServerId,
      imageName,
      fileName: fileTreeManager.getRootDocPath(),
      signal,
    })
      .then(data => {
        setData(data.texcount)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [signal, clsiServerId, projectId, imageName, fileTreeManager])

  return { data, error, loading }
}

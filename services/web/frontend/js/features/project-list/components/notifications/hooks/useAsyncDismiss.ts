import useAsync from '../../../../../shared/hooks/use-async'
import { deleteJSON } from '../../../../../infrastructure/fetch-json'
import { olConsole } from '../../../../../infrastructure/ol-console'

function useAsyncDismiss() {
  const { runAsync, ...rest } = useAsync()

  const handleDismiss = (id: number | string) => {
    runAsync(deleteJSON(`/api/notifications/${id}`)).catch(olConsole.error)
  }

  return { handleDismiss, ...rest }
}

export default useAsyncDismiss

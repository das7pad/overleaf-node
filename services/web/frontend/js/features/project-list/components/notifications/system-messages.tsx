import { useEffect } from 'react'
import SystemMessage from './system-message'
import TranslationMessage from './translation-message'
import useAsync from '../../../../shared/hooks/use-async'
import getMeta from '../../../../utils/meta'
import {
  SystemMessage as TSystemMessage,
  SuggestedLanguage,
} from '../../../../../../types/project/dashboard/system-message'
import { jwtGetJSON } from '../../../../infrastructure/jwt-fetch-json'

const MESSAGE_POLL_INTERVAL = 15 * 60 * 1000

function SystemMessages() {
  const { data: messages, setData, runAsync } = useAsync<TSystemMessage[]>()
  const suggestedLanguage = getMeta('ol-suggestedLanguage', undefined) as
    | SuggestedLanguage
    | undefined

  useEffect(() => {
    const pollMessages = () => {
      // Ignore polling if tab is hidden or browser is offline
      if (document.hidden || !navigator.onLine) {
        return
      }

      if (!getMeta('ol-jwtLoggedInUser')) {
        return
      }
      runAsync(
        jwtGetJSON({
          name: 'ol-jwtLoggedInUser',
          url: '/system/messages',
          refreshEndpoint: '/api/user/jwt',
        })
      ).catch(console.error)
    }

    const cached = getMeta('ol-systemMessages')
    if (cached) {
      setData(cached)
    } else {
      pollMessages()
    }

    const interval = setInterval(pollMessages, MESSAGE_POLL_INTERVAL)

    return () => {
      clearInterval(interval)
    }
  }, [runAsync, setData])

  if (!messages?.length && !suggestedLanguage) {
    return null
  }

  return (
    <ul className="system-messages">
      {messages?.map((message, idx) => (
        <SystemMessage key={idx} id={message._id}>
          {message.content}
        </SystemMessage>
      ))}
      {suggestedLanguage ? <TranslationMessage /> : null}
    </ul>
  )
}

export default SystemMessages

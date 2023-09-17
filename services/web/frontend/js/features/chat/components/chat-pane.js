import React, { lazy, Suspense, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'

import MessageInput from './message-input'
import InfiniteScroll from './infinite-scroll'
import ChatFallbackError from './chat-fallback-error'
import Icon from '../../../shared/components/icon'
import { useLayoutContext } from '../../../shared/context/layout-context'
import { useUserContext } from '../../../shared/context/user-context'
import withErrorBoundary from '../../../infrastructure/error-boundary'
import { FetchError } from '../../../infrastructure/fetch-json'
import { useChatContext } from '../context/chat-context'
import LoadingSpinner, {
  FullSizeLoadingSpinner,
} from '../../../shared/components/loading-spinner'

const MessageList = lazy(() => import('./message-list'))

const ChatPane = React.memo(function ChatPane({ delay = 500 }) {
  const { t } = useTranslation()

  const { chatIsOpen } = useLayoutContext({ chatIsOpen: PropTypes.bool })
  const user = useUserContext({
    id: PropTypes.string.isRequired,
  })

  const {
    status,
    messages,
    initialMessagesLoaded,
    atEnd,
    loadInitialMessages,
    loadMoreMessages,
    reset,
    sendMessage,
    markMessagesAsRead,
    error,
  } = useChatContext()

  useEffect(() => {
    if (chatIsOpen && !initialMessagesLoaded) {
      loadInitialMessages()
    }
  }, [chatIsOpen, loadInitialMessages, initialMessagesLoaded])

  const shouldDisplayPlaceholder = status !== 'pending' && messages.length === 0

  const messageContentCount = messages.reduce(
    (acc, { contents }) => acc + contents.length,
    0
  )

  if (error) {
    // let user try recover from fetch errors
    if (error instanceof FetchError) {
      return <ChatFallbackError reconnect={reset} />
    }
    throw error
  }

  if (!user || !chatIsOpen) {
    return null
  }

  return (
    <aside className="chat">
      <InfiniteScroll
        atEnd={atEnd}
        className="messages"
        fetchData={loadMoreMessages}
        isLoading={status === 'pending'}
        itemCount={messageContentCount}
      >
        <div>
          <h2 className="sr-only">{t('chat')}</h2>
          {status === 'pending' && <LoadingSpinner delay={delay} />}
          {shouldDisplayPlaceholder && <Placeholder />}
          <Suspense fallback={<FullSizeLoadingSpinner delay={delay} />}>
            <MessageList
              messages={messages}
              userId={user.id}
              resetUnreadMessages={markMessagesAsRead}
            />
          </Suspense>
        </div>
      </InfiniteScroll>
      <MessageInput
        resetUnreadMessages={markMessagesAsRead}
        sendMessage={sendMessage}
      />
    </aside>
  )
})

ChatPane.propTypes = {
  delay: PropTypes.number,
}

function Placeholder() {
  const { t } = useTranslation()
  return (
    <>
      <div className="no-messages text-center small">{t('no_messages')}</div>
      <div className="first-message text-center">
        {t('send_first_message')}
        <br />
        <Icon type="arrow-down" />
      </div>
    </>
  )
}

export default withErrorBoundary(ChatPane, ChatFallbackError)

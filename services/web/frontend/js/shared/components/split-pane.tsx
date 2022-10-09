import usePersistedState from '../hooks/use-persisted-state'
import React, {
  createRef,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import Tooltip from './tooltip'
import classNames from 'classnames'
import Icon from './icon'

type Direction = 'right' | 'left' | 'down' | 'up'

export default function SplitPane({
  canClose = false,
  children,
  direction,
  id,
  initialClosed,
  initialSize,
  tooltip,
}: {
  canClose?: boolean
  children: ReactNode[]
  direction: Direction
  id: string
  initialClosed: boolean
  initialSize: number
  tooltip: ReactNode
}) {
  const up = direction === 'up'
  const down = direction === 'down'
  const left = direction === 'left'
  const right = direction === 'right'
  const vertical = up || down
  const horizontal = !vertical

  const [stored, store] = usePersistedState(`split-pane.${id}`, {
    size: initialSize,
    closed: initialClosed,
  })
  const [size, setSize] = useState<number>(stored.size)
  const [closed, setClosed] = useState<boolean>(canClose && stored.closed)

  useEffect(() => {
    store(prev => {
      if (prev.closed === closed && prev.size === size) return prev
      return { size, closed }
    })
  }, [size, closed, store])

  const [isResizing, setIsResizing] = useState<boolean>(false)
  const [isEffectivelyClosed, setIsEffectivelyClosed] = useState(false)
  const ref = createRef<HTMLDivElement>()

  const onMouseUp = () => {
    setIsResizing(false)
    if (canClose && isEffectivelyClosed) {
      setClosed(true)
      setSize(initialSize)
    }
  }
  const onTouchEnd = onMouseUp
  const onMouseDown = (event: React.MouseEvent) => {
    if (event.buttons !== 1) return // not primary button
    setIsResizing(true)
  }
  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length > 1) return // multi-touch
    setIsResizing(true)
  }
  const onMouseMove = (event: MouseEvent | Touch) => {
    if (horizontal) {
      onMouseMoveX(event)
    } else {
      onMouseMoveY(event)
    }
  }
  const onMouseMoveX = (event: MouseEvent | Touch) => {
    if (!isResizing || !ref.current) return
    const edges = ref.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(event.clientX - edges.x, edges.width))
    setIsEffectivelyClosed(left ? x === 0 : x === edges.width)
    setSize(x)
  }
  const onMouseMoveY = (event: MouseEvent | Touch) => {
    if (!isResizing || !ref.current) return
    const edges = ref.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(event.clientY - edges.y, edges.height))
    setIsEffectivelyClosed(up ? y === 0 : y === edges.height)
    setSize(y)
  }
  const onTouchMove = (event: TouchEvent) => onMouseMove(event.touches[0])

  useLayoutEffect(() => {
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('touchmove', onTouchMove)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('touchmove', onTouchMove)
    }
  })

  // Resolve default value
  useLayoutEffect(() => {
    if (!ref.current) return
    if (size !== -1) return
    const edges = ref.current.getBoundingClientRect()
    if (horizontal) {
      setSize(edges.width / 2)
    } else {
      setSize(edges.height / 2)
    }
  }, [ref, size, horizontal])

  const closeButton = (
    <button
      className="split-pane-toggler"
      onClick={() => setClosed(closed => !closed)}
    >
      <Icon
        type={'angle-' + (closed ? invertDirection(direction) : direction)}
      />
    </button>
  )
  const resizerIcon = (
    <Icon
      type={horizontal ? 'ellipsis-v' : 'ellipsis-h'}
      className="split-pane-resizer-icon"
    />
  )
  return (
    <div
      ref={ref}
      className={classNames('split-pane', {
        vertical,
        horizontal,
      })}
    >
      {!(closed && (left || up)) && (
        <div
          style={{
            [horizontal ? 'width' : 'height']: size === -1 ? '50%' : size,
          }}
        >
          {children[0]}
        </div>
      )}
      <button
        className="split-pane-resizer"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        disabled={closed}
      >
        {canClose && !closed && resizerIcon}
        {canClose ? (
          <Tooltip
            description={tooltip}
            id={'tooltip-' + id}
            overlayProps={{ placement: invertDirection(direction) }}
          >
            {closeButton}
          </Tooltip>
        ) : (
          resizerIcon
        )}
        {canClose && !closed && resizerIcon}
      </button>
      {!(closed && (right || down)) && (
        <div style={{ flex: 1 }}>{children[1]}</div>
      )}
    </div>
  )
}

function invertDirection(direction: Direction) {
  switch (direction) {
    case 'left':
      return 'right'
    case 'right':
      return 'left'
    case 'up':
      return 'down'
    case 'down':
      return 'up'
  }
}

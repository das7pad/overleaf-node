import { cloneElement, ReactElement, ReactNode } from 'react'
import t from '../../infrastructure/t'

export function _recursiveComponentSubstitute(
  chunk: string,
  components: Record<string, ReactElement>
) {
  // 'PRE<0>INNER</0>POST' -> ['PRE', '0', 'INNER', 'POST']
  // '<0>INNER</0>' -> ['', '0', 'INNER', '']
  // '<0></0>' -> ['', '0', '', '']
  // '<0>INNER</0><0>INNER2</0>' -> ['', '0', 'INNER', '', '0', 'INNER2', '']
  // '<0><1>INNER</1></0>' -> ['', '0', '<1>INNER</1>', '']
  // 'PRE<b>INNER</b>POST' -> ['PRE', 'b', 'INNER', 'POST']
  const parts = chunk.split(/<(\d+|b|code)>(.*?)<\/\1>/g)
  const output: ReactNode[] = parts.splice(0, 1) // extract the 'PRE' part
  while (parts.length) {
    // each batch consists of three items: ['0', 'INNER', 'POST']
    const [idx, innerChunk, intermediateChunk] = parts.splice(0, 3)
    const children = _recursiveComponentSubstitute(innerChunk, components)
    output.push(
      cloneElement(components[idx], { key: output.length }, ...children)
    )
    output.push(intermediateChunk)
  }
  return output
}

export function Trans({
  i18nKey,
  values,
  components,
  children,
  shouldUnescape,
}: {
  i18nKey: string
  values?: Record<any, any>
  components?: Record<any, ReactElement> | ReactElement[]
  children?: ReactElement | ReactElement[]
  shouldUnescape?: boolean
}) {
  if (children && !Array.isArray(children)) {
    children = [children]
  }
  return (
    <>
      {_recursiveComponentSubstitute(
        t(i18nKey, values),
        (components || children) as Record<any, ReactElement>
      )}
    </>
  )
}

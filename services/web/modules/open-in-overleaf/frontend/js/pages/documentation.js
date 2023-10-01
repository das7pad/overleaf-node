import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import latex from 'highlight.js/lib/languages/latex'
import php from 'highlight.js/lib/languages/php'
import xml from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/github.css'

function openInOverleaf(a) {
  /*
   * Get the unformatted code from the formatted code box.
   *
   * Using the browser's selection isn't ideal, because it clobbers whatever
   * the user may have had in their clipboard.
   * It's almost possible to use innerText, but that does not work on FF.
   * FF supports textContent, but that discards the newlines, which are
   * represented by BR tags in the formatted code. So, we have to walk the DOM.
   */
  function unformat(e) {
    let ret = ''
    if (e.nodeType === 1) {
      // element node
      if (e.tagName === 'BR') {
        return '\n'
      } else {
        for (e = e.firstChild; e; e = e.nextSibling) {
          ret += unformat(e)
        }
        return ret
      }
    } else if (e.nodeType === 3 || e.nodeType === 4) {
      // text node
      return e.nodeValue
    }
  }
  const code = a.parentNode.parentNode.getElementsByTagName('CODE')[0]
  document.getElementById('ol_encoded_snip').value = encodeURIComponent(
    unformat(code)
  )
  document.getElementById('ol_form').submit()
}

document.querySelectorAll('a[data-ol-open-in-overleaf]').forEach(el => {
  el.onclick = e => {
    e.preventDefault()
    openInOverleaf(el)
  }
})

hljs.registerLanguage('html', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('php', php)
hljs.registerLanguage('tex', latex)
hljs.highlightAll()

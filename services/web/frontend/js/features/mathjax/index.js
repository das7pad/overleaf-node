import { loadMathJax } from '../../MathJaxLoader'

document.querySelectorAll('[data-ol-mathjax]').forEach(el => {
  loadMathJax()
    .then(MathJax => {
      setTimeout(() => {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, el])
      }, 0)
    })
    .catch(() => {})
})

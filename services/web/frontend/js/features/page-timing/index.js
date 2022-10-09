document.querySelectorAll('#page-timing').forEach(el => {
  try {
    const duration = performance
      .getEntries()[0]
      .serverTiming.find(e => e.name === 'total').duration
    el.textContent = `Page: ${duration.toFixed(3)}ms`
    el.hidden = false
  } catch (e) {}
})

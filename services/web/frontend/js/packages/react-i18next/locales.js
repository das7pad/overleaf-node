import en from '../../../../locales/en.json'

export const LOCALES = new Map([['', '']])

function populate(locales) {
  Object.entries(locales).map(([k, v]) => LOCALES.set(k, v))
}

async function load(lng) {
  return (await import(`../../../../locales/${lng}.json`)).default
}

export async function init(language, defaultLang) {
  populate(en)

  // en.json overwrites all other locales, skip loading defaultLang.
  if (language === 'en') return

  try {
    const queue = await Promise.all([
      defaultLang === 'en' ? {} : load(defaultLang),
      load(language),
    ])
    for (const locales of queue) {
      populate(locales)
    }
  } catch (err) {
    console.error('Failed to load non English locales', err)
  }
}

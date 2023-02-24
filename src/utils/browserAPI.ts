

export const getCurrentTab = async (): Promise<chrome.tabs.Tab | null> => {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })
  if (tabs.length === 0) return null
  if (!tabs[0].id) return null
  return tabs[0]
}

const injectedKey = '__my_extension_injected__'

function isInjected(name: string): boolean {
  return ((window as any)[injectedKey] || {})[name] === true
}

export const markInjected = (name: string): void => {
  if (!(window as any)[injectedKey]) {
    (window as any)[injectedKey] = {}
  }
  (window as any)[injectedKey][name] = true
  console.log(`${name} injected`)
}

// https://developer.chrome.com/docs/extensions/mv3/content_scripts/#programmatic
export const injectScript = async (file: string, tabId: number): Promise<void> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: isInjected,
    args: [file],
  })
  if (results.length > 0 && results[0].result === true) {
    console.debug(`${file} already injected, skip`)
    return
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [file],
  })
}

export const openOrCreatePage = async (page: string, nextToCurrent: boolean = true): Promise<chrome.tabs.Tab> => {
  const url = chrome.runtime.getURL(page)
  const tabs = await chrome.tabs.query({
    url,
  })
  if (tabs.length > 0) {
    // switch to the tab
    return chrome.tabs.update(tabs[0].id!, {
      active: true,
    })!
  }
  let index
  if (nextToCurrent) {
    const currentTab = await getCurrentTab()
    if (currentTab) {
      index = currentTab.index + 1
    }
  }
  return chrome.tabs.create({
    url,
    ...(index !== undefined ? { index } : {}),
  })
}

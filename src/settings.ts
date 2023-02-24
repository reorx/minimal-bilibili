export interface Settings {
  autoFocusSearchBar: boolean
}

export const defaultSettings: Settings = {
  autoFocusSearchBar: true,
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get('settings')
  const {settings} = data
  if (!settings) return {...defaultSettings}
  return settings
}

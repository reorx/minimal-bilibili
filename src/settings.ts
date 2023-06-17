export interface Settings {
  autoFocusSearchBar: boolean
  autoLoadVideoColumn: boolean
  autoLoadBangumiColumn: boolean
}

export const defaultSettings: Settings = {
  autoFocusSearchBar: false,
  autoLoadVideoColumn: true,
  autoLoadBangumiColumn: true,
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get('settings')
  const {settings} = data
  if (!settings) return {...defaultSettings}
  return {...defaultSettings, ...settings}
}

export interface Settings {
  showRecommend: boolean
  autoFocusSearchBar: boolean
  autoLoadVideoColumn: boolean
  blockedWords: string
}

export const defaultSettings: Settings = {
  showRecommend: true,
  autoFocusSearchBar: false,
  autoLoadVideoColumn: true,
  blockedWords: '',
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get('settings')
  const {settings} = data
  if (!settings) return {...defaultSettings}
  return {...defaultSettings, ...settings}
}

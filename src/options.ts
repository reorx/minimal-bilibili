import './options.scss';

import $ from 'cash-dom';

import { defaultSettings, loadSettings, Settings } from './settings';


const store: {settings: Settings} = {
  settings: {...defaultSettings},
}

const $autoFocus = $('#input-auto-focus')
$autoFocus.on('change', () => {
  store.settings.autoFocusSearchBar = $autoFocus.prop('checked')
})

$('#fn-save').on('click', () => {
  chrome.storage.sync.set({
    settings: store.settings,
  })
})

loadSettings().then((settings) => {
  store.settings = settings
  console.log('loaded settings', store.settings)

  // load settings to UI
  $autoFocus.prop('checked', store.settings.autoFocusSearchBar)
})

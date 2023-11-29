import './options.scss';

import $ from 'cash-dom';

import { defaultSettings, loadSettings, Settings } from './settings';


const store: {settings: Settings} = {
  settings: {...defaultSettings},
}

const $showRecommend = $('#v-show-recommend')
$showRecommend.on('change', () => {
  store.settings.showRecommend = $showRecommend.prop('checked')
})

const $autoFocus = $('#v-auto-focus')
$autoFocus.on('change', () => {
  store.settings.autoFocusSearchBar = $autoFocus.prop('checked')
})

const $autoLoadVideoColumn = $('#v-auto-load-video-column')
$autoLoadVideoColumn.on('change', () => {
  store.settings.autoLoadVideoColumn = $autoLoadVideoColumn.prop('checked')
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
  $showRecommend.prop('checked', store.settings.showRecommend)
  $autoFocus.prop('checked', store.settings.autoFocusSearchBar)
  $autoLoadVideoColumn.prop('checked', store.settings.autoLoadVideoColumn)
})

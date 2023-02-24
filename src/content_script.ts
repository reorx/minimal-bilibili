import $ from 'cash-dom';

import { colors, getLogger } from './utils/log';
import { formatDate, formatDuration } from './utils/misc';


declare global {
  interface Window {
    __pinia: any
  }
}

const lg = getLogger('content_script', colors.bgYellowBright)

lg.info('content_script.ts');

setTimeout(() => {
  const searchInput = document.querySelector('input.nav-search-input') as HTMLInputElement
  searchInput.focus()
}, 1000);

// remove download button
const downloadLink = document.querySelector('.download-client-trigger')
downloadLink?.parentElement?.remove()


function injectScript(file: string) {
  const body = document.getElementsByTagName('body')[0];
  const s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', file);
  body.appendChild(s);
}

injectScript(chrome.runtime.getURL('/js/inject.js'))

// get uid
const profileLink = document.querySelector('.header-entry-mini') as HTMLLinkElement
const uidRegex = /space\.bilibili\.com\/(\d+)/
const uid = profileLink.href.match(uidRegex)![1]
console.log('uid', uid)

async function fetchDynamics(): Promise<DynamicData> {
  // see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/dynamic/get_dynamic_detail.md
  // for type_list values meaning
  const url = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=${uid}&type_list=8,512,4097,4098,4099,4100,4101`

  const resp = await fetch(url, {
    credentials: 'include',
  })
  return resp.json()
}

interface DynamicData {
  data: {
    cards: {
      card: string
      desc: {
        // video id, e.g. BV1Dx4y1F7u3; video url: https://www.bilibili.com/video/BV1Dx4y1F7u3
        bvid: string
        dynamic_id_str: string
        // e.g. 1677212231
        timestamp: string
        user_profile?: {
          info: {
            // avatar image url
            face: string
            // user id, e.g. 31700507; user url: https://space.bilibili.com/31700507
            uid: number
            uname: string
          }
        }
      }
      display: any
      extend_json: string
    }[]
  }
}

interface VideoCard {
  // 【游研社】在末日生存如何解决“住房”问题？
  title: string
  // "在当今的文化作品中，末日题材已越发被大家熟悉。丧尸、核平、冻土、水灾......在这些诸多的末日题材中，总有那么一群生存大师，即便身处的环境再差，也要想办法给自己解决“住房”问题。今天我们就来和大家聊聊末日生存该如何解决“住”的问题。"
  desc: string
  // e.g. 1677212230
  pubdate: number
  // duration in seconds
  duration: number
  // video thumbnail url
  pic: string
  // statistics
  stat: {
    like: number
    coin: number
    favorite: number
    reply: number
    view: number
  }
  // tag name, e.g. 单机游戏
  tname: string
  // tag id
  tid: number
}

interface BangumiCard {
  index: string
  cover: string
  apiSeasonInfo: {
    title: string
    cover: string
  }
  url: string
}

const dynamicsParent = $('.bili-feed4')
const dynamicsContainer = $('<div class="dynamics-container">').appendTo(dynamicsParent)
let dynamicsSeq = 0

fetchDynamics().then(data => {
  console.log('data', data)
  for (const item of data.data.cards) {
    dynamicsSeq++
    const desc = item.desc
    const _card = JSON.parse(item.card)
    let innerHtml
    if (desc.bvid) {
      const card = _card as VideoCard
      innerHtml = `
        <span class="seq">${dynamicsSeq}</span
        ><a href="https://www.bilibili.com/video/${desc.bvid} target="_blank">${card.title}</a>
        —
        <a href="https://space.bilibili.com/${desc.user_profile?.info.uid}" target="_blank">${desc.user_profile?.info.uname}</a>
        —
        <span>${formatDate(card.pubdate)}</span>
        —
        <span>${formatDuration(card.duration)}</span>
      `
    } else {
      const card = _card as BangumiCard
      console.log('bangumi card', card)
      innerHtml = `
        <span class="seq">${dynamicsSeq}</span
        ><a href="${card.url}" target="_blank">${card.index}</a>
        —
        <span>${card.apiSeasonInfo.title}</span>
      `
    }

    const dynamicItem = $('<div class="dynamic-item">').appendTo(dynamicsContainer)
    dynamicItem.html(innerHtml)
  }
})

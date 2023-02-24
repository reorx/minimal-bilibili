import $, { Cash } from 'cash-dom';

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

async function fetchDynamics(uid: string, dynamicId: string|undefined): Promise<DynamicData> {
  // see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/dynamic/get_dynamic_detail.md
  // for type_list values meaning
  let url = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=${uid}&type_list=8,512,4097,4098,4099,4100,4101`
  if (dynamicId) {
    url += `&offset_dynamic_id=${dynamicId}`
  }

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
        timestamp: number
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


const uidInterval = setInterval(() => {
  // keep trying to get profile link
  const profileLink = document.querySelector('.header-entry-mini') as HTMLLinkElement
  if (!profileLink) {
    return
  }

  clearInterval(uidInterval)

  // get uid
  const uidRegex = /space\.bilibili\.com\/(\d+)/
  const uid = profileLink.href.match(uidRegex)![1]
  console.log('uid', uid)

  const container = initDynamics()
  loadDynamics(uid, container)
}, 100)

function initDynamics() {
  const dynamicsParent = $('.bili-feed4')
  return $('<div class="dynamics-container">').appendTo(dynamicsParent)
}

let dynamicsSeq = 0
let lastDynamicId: string | undefined

function loadDynamics(uid: string, container: Cash) {

  fetchDynamics(uid, lastDynamicId).then(data => {
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
          ><a class="with-sep title" href="https://www.bilibili.com/video/${desc.bvid} target="_blank">${card.title}</a
          ><a class="with-sep" href="https://space.bilibili.com/${desc.user_profile?.info.uid}" target="_blank">${desc.user_profile?.info.uname}</a
          ><span class="with-sep">${formatDate(card.pubdate)}</span
          ><span>${formatDuration(card.duration)}</span>
        `
      } else {
        const card = _card as BangumiCard
        console.log('bangumi card', card, item)
        innerHtml = `
          <span class="seq">${dynamicsSeq}</span
          ><a class="with-sep title" href="${card.url}" target="_blank">${card.index}</a
          ><span>${card.apiSeasonInfo.title}</span
          ><span class="with-sep">${formatDate(desc.timestamp)}</span>
        `
      }

      const dynamicItem = $('<div class="dynamic-item">').appendTo(container)
      dynamicItem.html(innerHtml)

      lastDynamicId = desc.dynamic_id_str
    }
  })
}

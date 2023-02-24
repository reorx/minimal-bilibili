import $, { Cash } from 'cash-dom';

import { colors, getLogger } from './utils/log';
import { formatDate, formatDuration } from './utils/misc';


const lg = getLogger('content_script', colors.bgYellowBright)
lg.info('content_script.ts');

setTimeout(() => {
  const searchInput = document.querySelector('input.nav-search-input') as HTMLInputElement
  searchInput.focus()
}, 1000);

// remove download button
const downloadLink = document.querySelector('.download-client-trigger')
downloadLink?.parentElement?.remove()

const TYPE_LIST = {
  VIDEO: '8',
  BANGUMI: '512,4097,4098,4099,4100,4101',
}

async function fetchDynamics(uid: string, dynamicId: string|null, type_list: string): Promise<DynamicData> {
  // see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/dynamic/get_dynamic_detail.md
  // for type_list values meaning
  let url
  if (dynamicId) {
    url = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_history?uid=${uid}&type_list=${type_list}&offset_dynamic_id=${dynamicId}`
  } else {
    url = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new?uid=${uid}&type_list=${type_list}`
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
  new_desc: string
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

  // create container
  const dynamicsParent = $('.bili-feed4')
  const container = $('<div class="dynamics-container">').appendTo(dynamicsParent)

  // init columns
  initDynamicsColumn(container, 'left', '视频', uid, TYPE_LIST.VIDEO)
  initDynamicsColumn(container, 'right', '番剧', uid, TYPE_LIST.BANGUMI)
}, 100)


interface ColumnState {
  dynamicsSeq: number
  lastDynamicId: string|null
}

function initDynamicsColumn(container: Cash, name: string, title: string, uid: string, type_list: string) {

  const column = $(`<section class="${name}-column">`).appendTo(container)
  $('<div class="title">').text(title).appendTo(column)
  const items = $('<div class="items">').appendTo(column)
  const actions = $('<div class="actions">').appendTo(column)
  const loadMore = $('<button class="load-more">').text('加载更多').appendTo(actions)

  const state: ColumnState = {
    dynamicsSeq: 0,
    lastDynamicId: null,
  }

  loadMore.on('click', async () => {
    loadMore.attr('disabled', 'disabled')
    await loadDynamics(state, items, uid, type_list)
    loadMore.removeAttr('disabled')
  })

  loadDynamics(state, items, uid, type_list)
}

async function loadDynamics(state: ColumnState, container: Cash, uid: string, type_list: string) {
  return fetchDynamics(uid, state.lastDynamicId, type_list).then(data => {
    console.log('data', data)
    for (const item of data.data.cards) {
      state.dynamicsSeq++
      const desc = item.desc
      const _card = JSON.parse(item.card)
      let innerHtml
      if (desc.bvid) {
        const card = _card as VideoCard
        innerHtml = `
          <div class="seq">${state.dynamicsSeq}</div>
          <div class="content">
            <div class="title">
              <a href="https://www.bilibili.com/video/${desc.bvid} target="_blank">${card.title}</a>
            </div>
            <div class="description">
            </div>
            <div class="meta">
              <a class="with-sep" href="https://space.bilibili.com/${desc.user_profile?.info.uid}" target="_blank">${desc.user_profile?.info.uname}</a
              ><span class="with-sep">${formatDate(card.pubdate)}</span
              ><span>${formatDuration(card.duration)}</span>
            </div>
          </div>
        `
      } else {
        const card = _card as BangumiCard
        console.log('bangumi card', card, item)
        innerHtml = `
          <div class="seq">${state.dynamicsSeq}</div>
          <div class="content">
            <div class="title">
              <a href="${card.url}" target="_blank">${card.new_desc}</a>
            </div>
            <div class="meta">
              <span class="with-sep">${card.apiSeasonInfo.title}</span
              ><span>${formatDate(desc.timestamp)}</span>
            </div>
          </div>
        `
      }

      const dynamicItem = $('<div class="dynamic-item">').appendTo(container)
      dynamicItem.html(innerHtml)

      state.lastDynamicId = desc.dynamic_id_str
    }
  })
}

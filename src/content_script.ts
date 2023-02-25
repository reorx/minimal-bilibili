import $, { Cash } from 'cash-dom';
import delegate from 'delegate-it';

import { parseBV, selectMedias } from './bilibili';
import { createPlayer, Player } from './player';
import { loadSettings } from './settings';
import { colors, getLogger } from './utils/log';
import { formatDate, formatDuration, hoursOrMinutesFrom } from './utils/misc';


/*
possible settings:
- [ ] enable/disable different columns
- [ ] enable/disable scroll to load
- [x] enable/disable auto focus search bar
- [ ] enable/disable hover seq to show preview
- [ ] feed font size

TODO:
- [ ] hover seq number to show preview
- [ ] column for recommendations
*/


const lg = getLogger('content_script', colors.bgYellowBright)
lg.info('content_script.ts');

const TYPE_LIST = {
  VIDEO: '8',
  BANGUMI: '512,4097,4098,4099,4100,4101',
}

const state: {currentPlayer: Player|null} = {
  currentPlayer: null,
}

/* main */

loadSettings().then((settings) => {
  if (settings.autoFocusSearchBar) {
    setTimeout(() => {
      const searchInput = document.querySelector('input.nav-search-input') as HTMLInputElement
      searchInput.focus()
    }, 1000);
  }

  // remove download button
  const downloadLink = document.querySelector('.download-client-trigger')
  downloadLink?.parentElement?.remove()

  // all the logics that rely on uid
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
    // console.log('uid', uid)

    // create container
    const dynamicsParent = $('.bili-feed4')
    const container = $('<div class="dynamics-container">').appendTo(dynamicsParent)

    // init columns
    const loadMoreFuncs: Array<() => Promise<void>> = []
    loadMoreFuncs.push(
      initDynamicsColumn(container, 'left', '视频', uid, TYPE_LIST.VIDEO)
    )
    loadMoreFuncs.push(
      initDynamicsColumn(container, 'right', '番剧', uid, TYPE_LIST.BANGUMI)
    )

    // create player dialog
    const playerDialog = document.createElement('dialog')
    playerDialog.classList.add('player-dialog')
    playerDialog.innerHTML = `
      <form method="dialog">
        <button class="close-button">X</button>
      </form>
      <div class="video-info">
        <div class="title"></div>
        <div class="author"></div>
      </div>
      <div class="player-container"></div>
      <div class="player-controls">
        <div class="volume-slider"></div>
        <div class="quality-switcher"></div>
      </div>
    `
    document.body.appendChild(playerDialog)

    playerDialog.addEventListener('close', () => {
      if (state.currentPlayer) {
        state.currentPlayer.destroy()
      }
    })

    // listen to video link click
    delegate(container.get(0) as HTMLDivElement, '.dynamic-item .title a', 'click', async (e) => {
      e.preventDefault()
      playerDialog.showModal()
      if (state.currentPlayer) {
        state.currentPlayer.destroy()
      }

      const url = (e.target as HTMLLinkElement).href
      const resp = await fetch(url)
      const html = await resp.text()
      const playInfo = await parseBV(html, url)
      const $playerContainer = $('.player-container')

      // select video and audio
      const {video, audio} = selectMedias(playInfo)
      state.currentPlayer = createPlayer(video, audio)
      $playerContainer.append(state.currentPlayer.el)
    })

    // load more when scroll to bottom
    detectScrollToBottom(async () => {
      await Promise.all(loadMoreFuncs.map(f => f()))
    })
  }, 100)
})

/* functions */

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

  const loadMoreFunc = async () => {
    loadMore.attr('disabled', 'disabled')
    await loadDynamics(state, items, uid, type_list)
    loadMore.removeAttr('disabled')
  }

  loadMore.on('click', loadMoreFunc)

  loadDynamics(state, items, uid, type_list)
  return loadMoreFunc
}

async function loadDynamics(state: ColumnState, container: Cash, uid: string, type_list: string) {

  return fetchDynamics(uid, state.lastDynamicId, type_list).then(data => {
    // console.log('data', data)
    for (const item of data.data.cards) {
      state.dynamicsSeq++
      const desc = item.desc
      const _card = JSON.parse(item.card)
      let innerHtml
      let dateStr
      if (desc.bvid) {
        const card = _card as VideoCard
        innerHtml = `
          <div class="seq">${state.dynamicsSeq}</div>
          ${divPreview(card.pic, card.desc)}
          <div class="content">
            <div class="title">
              <a href="https://www.bilibili.com/video/${desc.bvid}" target="_blank">${card.title}</a>
            </div>
            <div class="description">
            </div>
            <div class="meta">
              <span class="with-sep">${spanIcon('user')}<a href="https://space.bilibili.com/${desc.user_profile?.info.uid}" target="_blank">${desc.user_profile?.info.uname}</a></span
              ><span class="with-sep">${spanIcon('calendar-time')}${hoursOrMinutesFrom(card.pubdate)}</span
              ><span class="with-sep">${spanIcon('clock')}${formatDuration(card.duration)}</span
              ><span class="stats">
                ${spanIcon('thumb-up')}<span class="value">${card.stat.like}</span>
                ${spanIcon('coin-yuan')}<span class="value">${card.stat.coin}</span>
                ${spanIcon('star')}<span class="value">${card.stat.favorite}</span>
              </span>
            </div>
          </div>
        `
        dateStr = formatDate(card.pubdate)
      } else {
        const card = _card as BangumiCard
        // console.log('bangumi card', card, item)
        innerHtml = `
          <div class="seq">${state.dynamicsSeq}</div>
          ${divPreview(card.cover, card.apiSeasonInfo.title)}
          <div class="content">
            <div class="title">
              <a href="${card.url}" target="_blank">${card.new_desc}</a>
            </div>
            <div class="meta">
              <span class="with-sep">${spanIcon('user')}${card.apiSeasonInfo.title}</span
              ><span>${spanIcon('calendar-time')}${hoursOrMinutesFrom(desc.timestamp)}</span
            </div>
          </div>
        `
        dateStr = formatDate(desc.timestamp)
      }

      // get or create date separator
      const dateSeparator = container.find(`.date-separator[data-date="${dateStr}"]`)
      if (dateSeparator.length === 0) {
        $(`<div class="date-separator" data-date="${dateStr}"><span>${dateStr}</span></div>`).appendTo(container)
      }

      const dynamicItem = $('<div class="dynamic-item">').appendTo(container)
      dynamicItem.html(innerHtml)

      state.lastDynamicId = desc.dynamic_id_str
    }
  })
}

function spanIcon(icon: string) {
  return `<span class="icon icon--tabler icon--tabler--${icon}"></span>`
}

function divPreview(img: string, desc: string) {
  return `
    <div class="preview">
      <div class="inner">
        <img src="${img}">
        <div class="desc">简介: ${desc}</div>
      </div>
    </div>
  `
}

function detectScrollToBottom(callback: () => Promise<void>) {
  let isDoing = false;

  window.addEventListener("scroll", async function () {
    if (isDoing) return

    const scrollPosition = window.scrollY;
    const windowSize = window.innerHeight;
    const fullSize = document.body.scrollHeight;
    if (scrollPosition + windowSize >= fullSize) {
      isDoing = true
      await callback();
      isDoing = false
    }
  });
}

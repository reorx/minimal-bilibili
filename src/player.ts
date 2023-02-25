import { Cash } from 'cash-dom';

import { AudioInfo, PlayInfo, selectMedias, VideoInfo } from './bilibili';


/*
Docs:
- https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Video_and_audio_content
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event
*/

export interface PlayerPreference {
  volume: number
}

const defaultPreference = {
  volume: 80
}

const storageKeyPreference = 'minimal-bilibili-player-preference'

export class Player {
  el: HTMLDivElement
  playInfo: PlayInfo
  video: VideoInfo
  audio: AudioInfo
  elVideo: HTMLVideoElement
  elAudio: HTMLAudioElement
  syncInterval: NodeJS.Timer
  preference: PlayerPreference

  constructor(playInfo: PlayInfo) {
    this.playInfo = playInfo
    const {video, audio} = selectMedias(playInfo)

    this.el = document.createElement('div')
    this.el.id = "minimal-bilibili-player"
    this.preference = this.loadPreference()

    const elVideo = createVideo(video.baseUrl, video.mimeType, 640)
    const elAudio = createAudio(audio.baseUrl, 'audio/mp4')

    this.el.appendChild(elVideo)
    this.el.appendChild(elAudio)

    elVideo.addEventListener('play', () => {
      elAudio.play()
      console.log('play')
    })
    elVideo.addEventListener('pause', () => {
      elAudio.pause()
      console.log('pause')
    })
    elVideo.addEventListener('ratechange', () => {
      elAudio.playbackRate = elVideo.playbackRate
    })

    // https://stackoverflow.com/questions/66683613/how-to-combine-video-source-with-audio
    const syncTime = () => {
      if (elAudio.currentTime !== elVideo.currentTime)
        elAudio.currentTime = elVideo.currentTime;
    }

    elVideo.addEventListener('seeked', () => {
      console.log('seeked')
      syncTime()
    })

    this.syncInterval = setInterval(() => {
      syncTime()
    }, 2000)

    elVideo.play()

    this.elVideo = elVideo
    this.elAudio = elAudio
    this.video = video
    this.audio = audio
  }

  loadPreference() {
    const _pref = localStorage.getItem(storageKeyPreference)
    if (_pref) {
      return JSON.parse(_pref) as PlayerPreference
    }
    return {...defaultPreference}
  }

  savePreference() {
    localStorage.setItem(storageKeyPreference, JSON.stringify(this.preference))
  }

  setVolume(volume: number) {
    this.preference.volume = volume
    this.elAudio.volume = volume / 100
  }

  initVolumeSlider($el: Cash) {
    const input = $el.get(0) as HTMLInputElement
    input.min = '0'
    input.max = '100'
    input.step = '1'
    input.value = this.preference.volume.toString()
  }

  initQualitySwitcher($el: Cash) {
    const select = $el.get(0) as HTMLSelectElement

    const availableQualitiesMap: {[key: string]: boolean} = {}
    this.playInfo.mediaInfo.videos.forEach(v => {
      availableQualitiesMap[v.id] = true
    })

    for (const opt of this.playInfo.qualityOptions) {
      // ignore unavailable quality
      if (!availableQualitiesMap[opt.value]) continue

      const el = document.createElement('option')
      el.value = opt.value.toString()
      el.innerText = opt.label
      if (opt.value === this.video.id)
        el.selected = true
      select.appendChild(el)
    }
  }

  switchQuality(quality: number) {
    const {video} = selectMedias(this.playInfo, quality)
    const {elVideo} = this
    const time = elVideo.currentTime
    elVideo.pause()
    const source = this.elVideo.children[0] as HTMLSourceElement
    source.src = video.baseUrl

    const onLoad = () => {
      elVideo.removeEventListener('loadedmetadata', onLoad)
      elVideo.currentTime = time
      elVideo.play()
    }
    elVideo.addEventListener('loadedmetadata', onLoad)
    elVideo.load()
  }

  destroy() {
    clearInterval(this.syncInterval)
    this.elVideo.remove()
    this.elAudio.remove()
    this.el.remove()
  }
}


function createVideo(src: string, type: string, width: number) {
  const video = document.createElement('video')
  video.controls = true
  // video.width = width

  // add source
  const source = document.createElement('source')
  source.src = src
  source.type = type
  video.appendChild(source)

  return video
}

function createAudio(src: string, type: string) {
  const audio = document.createElement('audio')
  // audio.controls = true
  audio.volume = 0.8

  // add source
  const source = document.createElement('source')
  source.src = src
  source.type = type
  audio.appendChild(source)
  return audio
}

import { AudioInfo, VideoInfo } from './bilibili';


/*
Docs:
- https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Video_and_audio_content
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event
*/

export interface Player {
  el: HTMLDivElement
  destroy: () => void
}

export function createPlayer(video: VideoInfo, audio: AudioInfo) {
  const el = document.createElement('div')
  el.id = "minimal-bilibili-player"

  const elVideo = createVideo(video.baseUrl, video.mimeType, 640)
  const elAudio = createAudio(audio.baseUrl, 'audio/mp4')

  el.appendChild(elVideo)
  el.appendChild(elAudio)

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

  const syncInterval = setInterval(() => {
    syncTime()
  }, 2000)

  elVideo.play()

  const player: Player = {
    el,
    destroy: () => {
      clearInterval(syncInterval)
      elVideo.remove()
      elAudio.remove()
      el.remove()
    }
  }
  return player

  // const player = new Plyr(el)
  // player.play()
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

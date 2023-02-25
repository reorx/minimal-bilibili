export interface VideoInfo {
  id: number
  baseUrl: string
  backupUrl: string[]
  codecs: string
  mimeType: string
  frameRate: string
}

export interface AudioInfo {
  id: number
  cid: number
  baseUrl: string
}

export interface MediaInfo {
  acceptQuality: number[]
  videos: VideoInfo[]
  audios: AudioInfo[]
}

export interface QualityOption {
  label: string
  value: number
}

export interface PlayInfo {
  title: string
  url: string
  bvid: string
  cid: string
  cover: string
  mediaInfo: MediaInfo
  qualityOptions: QualityOption[]
}

// https://github.com/BilibiliVideoDownload/BilibiliVideoDownload/blob/master/src/core/bilibili.ts
export const parseBV = async (html: string, url: string) => {
  const videoInfo = html.match(/\<\/script\>\<script\>window\.\_\_INITIAL\_STATE\_\_\=([\s\S]*?)\;\(function\(\)/)
  if (!videoInfo) throw new Error('parse bv error')
  const { videoData } = JSON.parse(videoInfo[1])
  // 获取视频下载地址
  let acceptQuality = null
  // try {
  let downLoadData: any = html.match(/\<script\>window\.\_\_playinfo\_\_\=([\s\S]*?)\<\/script\>\<script\>window\.\_\_INITIAL\_STATE\_\_\=/)
  if (!downLoadData) throw new Error('parse bv error')
  downLoadData = JSON.parse(downLoadData[1])

  const mediaInfo: MediaInfo = {
    acceptQuality: downLoadData.data.accept_quality,
    videos: downLoadData.data.dash.video,
    audios: downLoadData.data.dash.audio
  }
  // } catch (error) {
  //   acceptQuality = await getAcceptQuality(videoData.cid, videoData.bvid)
  // }
  const obj = {
    title: videoData.title,
    url,
    bvid: videoData.bvid,
    cid: videoData.cid,
    cover: videoData.pic,
    mediaInfo,
    qualityOptions: mediaInfo.acceptQuality.map((item) => ({ label: qualityMap[item], value: item })),
  }
  console.log('bv')
  console.log(obj)
  return obj
}

export function selectMedias(playInfo: PlayInfo, quality?: number) {
  const { videos, audios } = playInfo.mediaInfo
  let video = videos[0]
  if (quality) {
    video = videos.find(v => v.id === quality) || video
  }
  const audio = audios[0]
  return {
    video,
    audio,
  }
}

/*
// 获取视频清晰度列表
const getAcceptQuality = async (cid: string, bvid: string) => {
  const { body: { data: { accept_quality, dash: { video, audio } } }, headers: { 'set-cookie': responseCookies } } = await window.electron.got(
    `https://api.bilibili.com/x/player/playurl?cid=${cid}&bvid=${bvid}&qn=127&type=&otype=json&fourk=1&fnver=0&fnval=80&session=68191c1dc3c75042c6f35fba895d65b0`,
    config
  )
  return {
    accept_quality,
    video,
    audio
  }
}
*/

const qualityMap: {[key: number]: string} = {
  127: '8K超高清',
  126: '杜比视界',
  125: 'HDR真彩',
  120: '4K超清',
  116: '1080P60帧',
  112: '1080P+高码率',
  80: '1080P',
  74: '720P60帧',
  64: '720P',
  32: '480P清晰',
  16: '320P流畅'
}

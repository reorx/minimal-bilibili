import { colors, getLogger } from './utils/log';


const lg = getLogger('video_content_script', colors.blue)

function getVideoEl(): HTMLVideoElement | null {
  return document.querySelector('#bilibiliPlayer video,#bilibili-player video,.bilibili-player video,.player-container video,#bilibiliPlayer bwp-video,#bilibili-player bwp-video,.bilibili-player bwp-video,.player-container bwp-video,#bofqi video,[aria-label="\u54d4\u54e9\u54d4\u54e9\u64ad\u653e\u5668"] video')
}

function processVideoPage() {
  const videoEl = getVideoEl()
  if (!videoEl) {
    lg.error('video element not found')
    return
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const tagName = target.tagName
    if ("INPUT" !== tagName && "TEXTAREA" !== tagName && !target.isContentEditable) {
      // not any input element
      const keyCode = e.code;
      // console.log('keyCode', keyCode, e.shiftKey)
      if (keyCode === 'KeyS') {
        console.log('s pressed, shiftKey: ', e.shiftKey)
        captureVideoImage(videoEl, e.shiftKey)
      }
    }
  }, true)
}

function captureVideoImage(videoEl: HTMLVideoElement, saveToFile: boolean = false) {
  const imageFormat = "png";

  if (videoEl && !(2 > videoEl.readyState)) {
    if ("BWP-VIDEO" === videoEl.tagName) {
      if ((videoEl as any).toDataURL) {
        const videoAsCanvas = videoEl as any as HTMLCanvasElement
        if (!saveToFile) {
          const dataUrl = videoAsCanvas.toDataURL().split(",");
          const _mimeType = dataUrl[0].match(/:(.*?);/)
          if (!_mimeType) {
            throw 'mimeType not found'
          }
          const mimeType = _mimeType[1];
          const binaryData = atob(dataUrl[1]);
          const length = binaryData.length;
          const dataArray = new Uint8Array(length);
          for (let i = length; i--;) {
            dataArray[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([dataArray], {
            type: mimeType
          });
          saveImageToClipboard(blob);
        } else {
          downloadDataUrl(videoAsCanvas.toDataURL(), getScreenshotFilename(videoEl, imageFormat));
        }
      }
    } else {
      const canvasEl = document.createElement("canvas")
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      canvasEl.getContext("2d")!.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      if (!saveToFile) {
        canvasEl.toBlob((blob) => {
          if (blob) {
            saveImageToClipboard(blob);
          }
        });
      } else {
        downloadDataUrl(canvasEl.toDataURL(`image/${imageFormat}`, .98), getScreenshotFilename(videoEl, imageFormat));
      }
    }
  }
}

function getScreenshotFilename(videoEl: HTMLVideoElement, imageFormat: string) {
  return `screenshot-${videoEl.currentTime.toFixed(3)}.${imageFormat}`
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename
  link.href = dataUrl
  link.click();
}

function saveImageToClipboard(imageBlob: Blob) {
  navigator.clipboard.write([new ClipboardItem({
    [imageBlob.type]: imageBlob
  })]).then(function() {
    lg.info('Image copied.');
  }).catch(error => console.error(error));
}

class RetryLoop {
  private interval: number;
  private maxRetry: number;
  private retryCount: number;

  constructor(interval: number, maxRetry: number) {
    this.interval = interval;
    this.maxRetry = maxRetry;
    this.retryCount = 0;
  }

  start(fn: () => boolean) {
    const loop = () => {
      if (fn()) {
        return;
      }
      console.log('RetryLoop fn returns false, retryCount:', this.retryCount)

      if (this.retryCount < this.maxRetry) {
        this.retryCount++;
        setTimeout(loop, this.interval);
      }
      console.log('RetryLoop reached max retry count')
    };

    setTimeout(loop, this.interval);
  }
}

new RetryLoop(1000, 30).start(() => {
  lg.log('fn called')
  const hasVideoEl = !!getVideoEl()
  if (hasVideoEl) {
    setTimeout(processVideoPage)
  }
  return hasVideoEl
})

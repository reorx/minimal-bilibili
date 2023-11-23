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
  const clock = formatTimeClock(videoEl.currentTime);
  const clipboardCallback = () => {
    createToastIn(`📋 Screenshot ${clock} copied.`, videoEl.parentElement!)
  }
  const imageFormat = "png";
  const filename = getScreenshotFilename(videoEl, imageFormat)

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
          saveImageToClipboard(blob).then(clipboardCallback);
        } else {
          downloadDataUrl(videoAsCanvas.toDataURL(), filename);
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
            saveImageToClipboard(blob).then(clipboardCallback);
          }
        });
      } else {
        downloadDataUrl(canvasEl.toDataURL(`image/${imageFormat}`, .98), filename);
      }
    }
  }
}

function formatTimeClock(time: number, sep: string = ':'): string {
  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}${sep}${seconds}`;
}

function getScreenshotFilename(videoEl: HTMLVideoElement, imageFormat: string) {
  const htmlTitle = document.title;
  const title = htmlTitle.split('_bilibili')[0]
  return `${title}_${formatTimeClock(videoEl.currentTime, '-')}.${imageFormat}`
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename
  link.href = dataUrl
  link.click();
}

function saveImageToClipboard(imageBlob: Blob) {
  return navigator.clipboard.write([new ClipboardItem({
    [imageBlob.type]: imageBlob
  })]).then(function() {
    lg.info('Image copied.');
  }).catch(error => console.error(error));
}

function createToastIn(text: string, parentEl: HTMLElement) {
  const toast = document.createElement('div');
  toast.className = 'minimal-bilibili-video-toast';
  toast.style.opacity = '0'; // Set initial opacity to 0
  toast.style.transition = 'opacity 0.5s'; // Add transition effect

  const toastContent = document.createElement('div');
  toastContent.textContent = text
  toast.appendChild(toastContent);
  parentEl.appendChild(toast);

  // Fade in the toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 0);

  // Fade out the toast after 1 second
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      parentEl.removeChild(toast);
    }, 500); // Remove toast element after fade out
  }, 1000);
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

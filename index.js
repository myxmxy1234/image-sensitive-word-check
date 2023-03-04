#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const pathExist = require('path-exists').sync
const tencentcloud = require("tencentcloud-sdk-nodejs")
const sensitiveWords = require('./sensitiveWords.json')

let targetPath
let client
let needScanImgSize = 5 * 1024
let limit = 20 // 默认接口请求频率限制：20次/秒。
let imgInfoList = []


const isImg = file => /(png|jpg|jpeg)$/.test(file)

const initOcrClient = () => {
  const OcrClient = tencentcloud.ocr.v20181119.Client;
  const clientConfig = {
    credential: {
      secretId: 'secretId',
      secretKey: 'secretKey',
    },
    region: "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "ocr.tencentcloudapi.com",
      },
    },
  };
  client = new OcrClient(clientConfig);
}

const checkPathExist = () => {
  try {
    targetPath = path.normalize(process.argv[2])
    if (!pathExist(targetPath)) {
      throw new Error('未找到需要扫描的目录')
    }
    fs.unlinkSync('./list.txt')
  } catch (error) {
  }
}

// 扫描文件夹 获取所有的图片路径+图片名
const scanDir = p => {
  const files = fs.readdirSync(p)
  ;[...files].forEach(file => {
    const currentPath = path.join(p, file)
    const fileStat = fs.statSync(currentPath)
    const isDir = fileStat.isDirectory()
    if (isDir) {
      scanDir(currentPath)
    } else {
      // 只扫描大于5kb的图片 注：根据实际情况配置
      if (isImg(currentPath) && fileStat.size > needScanImgSize) {
        imgInfoList.push({
          filePath: currentPath,
          fileName: file
        })
      }
    }
  })
}

const loopScanImgList = (index = 0) => {
  const scanImgs = imgInfoList.slice(index * limit, ++index * limit)
  if (scanImgs.length) {
    scanImgs.forEach(img => scanFileByOcr(img))
    setTimeout(() => {
      loopScanImgList(index)
    }, 2000); // 每2s扫描20张图片
  }
}

const scanFileByOcr = ({ filePath }) => {
  const data = fs.readFileSync(path.join(filePath)).toString('base64').toString('base64')
  const base64 = /.png$/.test(filePath) ? `data:image/png;base64,${data}` : `data:image/jpg;base64,${data}`
  client.AdvertiseOCR({
    ImageBase64: base64 // 只能传线上图片地址 或者 base64
  }).then(data => {
    checkSensitiveWords(data.TextDetections, filePath)
  }, err => {
    console.log(err.code);
    if (err.code === 'FailedOperation.UnOpenError') {
      throw new Error('服务未开通')
    }
    // 没次数了
    if (err.code === 'ResourcesSoldOut.ChargeStatusException') {
      process.exit();
    }
    // 未识别到文字
    if (err.code === 'FailedOperation.ImageNoText') {
    }
  })
}

const checkSensitiveWords = (contentList, filePath) => {
  if (Array.isArray(contentList)) {
    const str = contentList.map(e => e.DetectedText.toLowerCase()).join('')
    let sensitiveStr = ''
    sensitiveWords.forEach(word => {
      if (str.includes(word)) {
        sensitiveStr +=  `${ sensitiveStr ? '、' : ''}${word}` 
      }
    })
    if (sensitiveStr) {
      fs.writeFileSync('./list.txt', `${filePath} 识别出以下敏感词 ${sensitiveStr}\r`, { flag: 'a' } )
    }
  }
}

const init = () => {
  checkPathExist()
  initOcrClient()
  scanDir(targetPath)
  loopScanImgList()
}

init()
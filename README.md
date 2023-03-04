# image-sensitive-word-check
A handy tool that can be used to scan images for sensitive content

## 一个基于腾讯云识别项目中图片敏感词的工具，你需要做以下几个准备工作
 - 注册腾讯云账号，并开通[文字识别功能](https://console.cloud.tencent.com/ocr/v2/overview)（开通送每个月1000次免费调用）
 - 获取腾讯云 secretId secretKey，并自行替换到 **index.js（22、23行）** 里 
 - 替换 **sensitiveWords.json** 里面的敏感词
 - npx image-sensitive-word-check  项目绝对路径（D:\workSpace\xxxx\src）


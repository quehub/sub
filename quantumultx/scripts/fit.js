/*
QX:
[rewrite_local]

#Fit健身会员 （by黑黑酱）
^https:\/\/bea\.sportq\.com\/SFitWeb\/sfit url script-response-body fit.js

[MITM]
hostname:bea.sportq.com

*/

let url = $request.url
let body = $response.body


let path1 = '/SFitWeb/sfit/getUserBaseInfo'
let path2 = '/SFitWeb/sfit/updateUserInfo'
let path3 = '/SFitWeb/sfit/getMessageNumber'
let path4 = '/SFitWeb/sfit/getUserBusInfo'
let comment = '还剩3天到期'

if (url.indexOf(path2) != -1) {
  let obj = JSON.parse(body)
  obj.entRet.entUserBaseInfo.hasTryVip = '1'
  obj.entRet.entUserBaseInfo.isBuyVip = '1'
  obj.entRet.entUserBaseInfo.isVip = '1'
  obj.entRet.entUserBaseInfo.privilegeComment = comment
  obj.entRet.entUserBaseInfo.vipComment = comment
  obj.entRet.entUserBaseInfo.vipEndComment = comment
  obj.entRet.entUserBaseInfo.vipText = '不要开通'
  body = JSON.stringify(obj)

} else if (url.indexOf(path2) != -1) {
  let obj = JSON.parse(body)
  obj.entRet.mineinfo.giveCommentVip = '1'
  obj.entRet.mineinfo.hasTryVip = '1'
  obj.entRet.mineinfo.isBuyVip = '1'
  obj.entRet.mineinfo.isVip = '1'
  obj.entRet.mineinfo.vipComment = comment
  obj.entRet.mineinfo.vipEndComment = comment
  obj.entRet.mineinfo.privilegeComment = comment
  obj.entRet.mineinfo.vipText = '不要开通'
  body = JSON.stringify(obj)

} else if (url.indexOf(path3) != -1) {
  let obj = JSON.parse(body)
  obj.isVip = '1'
  obj.openBannerAd = '0'
  obj.openWelcomeAd = '0'
  body = JSON.stringify(obj)

} else if (url.indexOf(path4) != -1) {
  let obj = JSON.parse(body)
  obj.entRet.entUserBusInfo.giveCommentVip = '1'
  body = JSON.stringify(obj)
}

$done({ body })

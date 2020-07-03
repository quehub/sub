/*
用药助手，无限3天后过期

[rewrite_local]
^https?:\/\/newdrugs\.dxy\.cn\/app\/user\/(init|pro\/stat) url script-response-body yyzs.js
[MITM]
hostname = newdrugs.dxy.cn
*/

const path1 = "/app/user/pro/stat"
const path2 = "/app/user/init"

let expireDate = new Date()
expireDate.setDate(expireDate.getDate() + 3)
// expireDate.setHours(0,0,0)
const url = $request.url
let obj = JSON.parse($response.body)
// var headers = $response.headers

if (url.indexOf(path1) != -1) {
  const userProInfoVO = {
    subscribeType: "iap",
    subscribe: false,
    subscribeExpiresDate: "1970-01-01 00:00:00",
    expiredTime: formatTime(expireDate),
    androidWithhold: false
  }
  obj.data.userProInfoVO = userProInfoVO
  obj.data.isActive = true
  obj.data.expireDate = formatTime(expireDate)
  obj.data.userProDiscountType = 3
} else if (url.indexOf(path2) != -1) {
  const userProInfoVO = {
    subscribeType: "iap",
    nowPrice: null,
    subscribe: false,
    subscribeProductTypeId: null,
    subscribeExpiresDate: "1970-01-01 00:00:00",
    originPrice: null,
    nowPayDesc: null,
    expiredTime: expireDate.getTime(),
    androidWithhold: false,
    productId: null,
    orderType: null
  }
  obj.data.isProActive = true
  obj.data.expireDate = formatTime(expireDate)
  obj.data.userProInfoVO = userProInfoVO
  obj.data.userProDiscountType = 3
}
$done({ body: JSON.stringify(obj) })

// 格式化时间
function formatTime(date) {
  const addZero = number => (number < 10 ? "0" + number : number)
  let Y = date.getFullYear() + "-"
  let M = addZero(date.getMonth() + 1) + "-"
  let D = addZero(date.getDate()) + " "
  let h = addZero(date.getHours()) + ":"
  let m = addZero(date.getMinutes()) + ":"
  let s = addZero(date.getSeconds())
  return Y + M + D + h + m + s
}

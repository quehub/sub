/**
 * QX
 * rewrite:
 * ^https:\/\/commerce-.*api\.faceu\.mobi\/commerce\/v1\/subscription\/user_info url script-response-body ulike.js
 * hostname:commerce-i18n-api.faceu.mobi,commerce-api.faceu.mobi
 */

if ($response != "undefined") {
  try {
    let body = $response.body
    let obj = JSON.parse(body)
    obj.data.flag = true
    obj.data.start_time = 1572760027
    obj.data.end_time = 4097368706
    obj.data.is_cancel_subscribe = false
    obj.systime = ""
    obj.errmsg = "Success"
    obj.ret = 0
    $done({ body: JSON.stringify(obj) })
  } catch (error) {
    console.log(`ulike error: ${error}`)
    console.log(obj)
  }
}

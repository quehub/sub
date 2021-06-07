/**
 * Bandwagon flow
 * 查询搬瓦工流量
 *
 *
 * 写入veid和api_key方法 (二选一)
 * 方法一: 修改文件的 config 中的值
 *
 * 方法二，配置读取response, 打开https://bandwagonhost.com/clientarea.php?action=products 网站 登陆 (需翻墙)
 * 依次点击 (KiwiVM Control Panel) => (API) => (Show API Key) 会分别通知veid和api_key写入成功
 * 写入脚本，通知写入成功之后，脚本即可禁用
 * [quantumult x]
 * ^https?:\/\/kiwivm\.64clouds\.com\/main-exec\.php\?mode=api url script-response-body bandwagon.js
 * hostname = kiwivm.64clouds.com
 *
 * [Loon] & [surge]
 * http-response ^https?:\/\/kiwivm\.64clouds\.com\/main-exec\.php\?mode=api requires-body=1,script-path=https://raw.githubusercontent.com/cronscript/script/master/bandwagon.js
 * hostname = kiwivm.64clouds.com
 *
 *
 *
 * 定时任务
 * [quantumult x]
 * 30 8 * * * bandwagon.js
 * [Loon] & [surge]
 * cron "0 30 8 * * *" script-path=https://raw.githubusercontent.com/cronscript/script/master/bandwagon.js
 */
const config = {
    veid: 0,       // 方法一，在此填入veid
    api_key: ""    // 方法一, 在此填入api_key
};

// 订阅使用key，存储在本地,卸载app会消失
const subConfig = {
    name: "搬瓦工流量查询",
    veid_key: "bandwagon_veid_key",
    api_key: "bandwagon_api_key"
}

const $tool = new Tool();

async function main() {
    if ($tool.ishttp) {
        getLoginValue();
    } else {
        await check_flow();
    }
    $tool.done()
}

main()
// get login value
function getLoginValue() {
    let veidRegex = /getServiceInfo\?veid=(\d+)/;
    let keyRegex = /value='(private_[a-zA-z0-9]+)/;
    let veidResult = veidRegex.exec($response.body);
    if (veidResult) {
        let veid = veidResult[1];
        if (veid) {
            $tool.write(`${veid}`, subConfig.veid_key);
            $tool.notify(subConfig.name, "veid写入成功", veid);
        }
    }
    let apiKeyResult = keyRegex.exec($response.body);
    if (apiKeyResult) {
        let api_key = apiKeyResult[1];
        if (api_key) {
            $tool.write(`${api_key}`, subConfig.api_key);
            $tool.notify(subConfig.name, "api_key写入成功", api_key);
        }
    }


}

// 格式化时间
function formatTime(date) {
    const Y = date.getFullYear() + '-';
    const M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    // var D = date.getDate() + ' ';
    const D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    const h = date.getHours() + ':';
    const m = date.getMinutes() + ':';
    const s = date.getSeconds();
    return Y + M + D + h + m + s;
}

// 前一个月时间
function preMonthTime(resetTime) {
    let date = new Date(resetTime);
    date.setMonth(date.getMonth() - 1);
    return date;
}

// 当前月份天数
function monthDays(currentTime) {
    const date = new Date(currentTime);
    //将当前月份加1，下移到下一个月
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.getDate();
}

// 计算当前时间 间隔
function intervalTimes(startTime, endTime) {
    let stime = Date.parse(startTime);
    let etime = Date.parse(endTime);
    // 两个时间戳相差的毫秒数
    let usedTime = etime - stime;
    // 计算相差的天数
    let days = Math.floor(usedTime / (24 * 3600 * 1000));
    // 计算天数后剩余的毫秒数
    let leave1 = usedTime % (24 * 3600 * 1000);
    // 计算出小时数
    let hours = Math.floor(leave1 / (3600 * 1000));
    // 计算小时数后剩余的毫秒数
    let leave2 = leave1 % (3600 * 1000);
    // 计算相差分钟数
    let minutes = Math.floor(leave2 / (60 * 1000));
    let time = days + "天" + hours + "时" + minutes + "分";
    return time;
}

// 平均每天使用流量
function averageFlow(startTime, endTime, flow, isUsed = true) {
    let stime = Date.parse(startTime);
    let etime = Date.parse(endTime);
    // 两个时间戳相差的毫秒数
    let usedTime = etime - stime;
    let dayFlow = flow / 1073741824 / usedTime * 1000 * 3600 * 24;
    // 剩余最后一天，修复流量计算过大
    if (!isUsed && usedTime < 1000 * 3600 * 24) {
        dayFlow = flow / 1073741824
    }
    return dayFlow.toFixed(3)
}


function parse_flow(data) {
    let currentTime = new Date();
    let resetTime = new Date(data.data_next_reset * 1000);
    let startTime = preMonthTime(resetTime);

    let use_plan = (data.data_counter / 1073741824).toFixed(2) + "/" + data.plan_monthly_data / 1073741824 + "G";
    let percent = (data.data_counter * 100 / data.plan_monthly_data).toFixed(2) + "%";
    let ip = data.ip_addresses[0];
    let reset_date = formatTime(resetTime);
    let start_date = formatTime(startTime);

    let days = monthDays(startTime);
    let residue = ((data.plan_monthly_data - data.data_counter) / 1073741824).toFixed(2) + "G"

    let subTitle = "已用: " + percent + ", " + use_plan + " 剩余: " + residue;

    let usedTimes = intervalTimes(startTime, currentTime);
    let residueTimes = intervalTimes(currentTime, resetTime);

    let residueFlow = averageFlow(currentTime, resetTime, data.plan_monthly_data - data.data_counter, false);
    let usedFlow = averageFlow(startTime, currentTime, data.data_counter, true);

    let msg1 = "已用: " + usedTimes + ", 平均每天: " + usedFlow + "GB";
    let msg2 = "剩余: " + residueTimes + ", 剩余每天: " + residueFlow + "GB";
    let msg3 = "本月: " + days + "天, 重置: " + reset_date;
    let message = msg1 + "\n" + msg2 + "\n" + msg3;

    $tool.notify(subConfig.name, subTitle, message);
    console.log(subTitle);
    console.log(message);
    // push(subConfig.name, subTitle+"\n"+ message)
}

async function check_flow() {
    if (!(config.veid && config.api_key)) {
        config.veid = parseInt($tool.read(subConfig.veid_key));
        config.api_key = $tool.read(subConfig.api_key);
    }
    if (!(config.veid && config.api_key)) {
        $tool.notify(subConfig.name, "", "请修改文件veid和api_key 或者 写入存储")
        return
    }
    let request = {
        url: `https://api.64clouds.com/v1/getServiceInfo?veid=${config.veid}&api_key=${config.api_key}`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 - mmbWebBrowse - ios",
            "Connection": "close"
        }
    };

    try {
        let response = await $tool.fetch(request)
        if (response.statusCode === 200) {
            parse_flow(JSON.parse(response.body))
        } else {
            console.log(response)
            $tool.notify(subConfig.name, "接口返回出错", response);
        }
    } catch (error) {
        console.log(error)
        $tool.notify(subConfig.name, "接口查询错误", error);
    }
}


function Tool() {
    // environment
    const env = {
        request: typeof $request !== "undefined",
        response: typeof $response !== "undefined",
        cron: typeof $request === "undefined" && typeof $response === "undefined",
        app: {
            surge: 'undefined' !== typeof $httpClient && 'undefined' === typeof $loon,
            loon: 'undefined' !== typeof $loon,
            quanx: typeof $task !== "undefined",
            node: typeof require === "function" && typeof $app === "undefined"
        }
    }


    // notification
    const notify = (title, subtitle, message) => {
        if (env.app.quanx) {
            $notify(title, subtitle, message)
        }
        if (env.app.surge || env.app.loon) {
            $notification.post(title, subtitle, message)
        }
        if (env.app.node) {
            console.log(JSON.stringify({title, subtitle, message}))
        }
    }

    // store
    const read = (key) => {
        if (env.app.quanx) return $prefs.valueForKey(key)
        if (env.app.surge || env.app.loon) return $persistentStore.read(key)
    }

    const write = (value, key) => {
        if (env.app.quanx) return $prefs.setValueForKey(value, key)
        if (env.app.surge || env.app.loon) return $persistentStore.write(value, key)
    }

    const fetch = async (options) => {
        if (env.app.quanx) {
            return $task.fetch(options)
        } else if (env.app.node) {
            const axios = require('axios');
            options["transformResponse"] = []
            axios.interceptors.response.use(function (response) {
                // console.log(typeof response.data)
                response.body = response.data
                return Promise.resolve(_status(response));
            });
            return axios(options)
        }else if (env.app.loon || env.app.surge) {
            return new Promise((resolve, reject) => {
                let method = "get"
                if (options["method"]) {
                    method = options["method"].toLowerCase()
                }
                $httpClient[method](options, (error, response, data) => {
                    if (error) {
                        reject(error)
                    } else {
                        response.body = data
                        resolve(_status(response))
                    }
                })
            })
        }
    }

    const _status = (response) => {
        if (response) {
            if (response.status) {
                response["statusCode"] = response.status
            } else if (response.statusCode) {
                response["status"] = response.statusCode
            }
        }
        return response
    }

    // done
    const done = (value = {}) => {
        console.log("done")
        if (env.app.loon || env.app.surge || env.app.quanx) {
            $done(value)
        } else if (env.app.node) {
            console.log("system exit")
        }
    }

    return {read, write, notify, fetch, env, done}
}


// 致谢
// https://github.com/yichahucha/surge/blob/master/tool.js
//https://github.com/chavyleung/scripts/blob/master/chavy.js


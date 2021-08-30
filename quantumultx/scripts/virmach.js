/**
 * @fileoverview Example to compose HTTP request
 * and handle the response.
 *
 */

const API = {
    key: "",
    hash: ""
}

const config = {
    name: "VirMach",
    title: "流量使用情况",
    api_key: "virmach_api_key",
    api_hash: "virmach_api_hash"
}


const $tool = new Tool();

async function main() {
    await check_flow();
    $tool.done()
}

// $tool.write(API.key, config.api_key)
// $tool.write(API.hash, config.api_hash)

main();

async function check_flow() {
    if (!(API.hash && API.key)) {
        API.key = $tool.read(config.api_key)
        API.hash = $tool.read(config.api_hash)
    }
    if (!(API.hash && API.key)) {
        $tool.notify(config.name, "", "请修改文件API{key,hash} 或者 写入存储")
        return
    }

    const request = {
        url: `https://solusvm.virmach.com/api/client/command.php?hash=${API.hash}&key=${API.key}&action=info&bw=true`,
        method: "POST",
        headers: {
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
            "Connection": "close"
        },
    };

    try {
        let response = await $tool.fetch(request)
        if (response.statusCode === 200) {
            parse_flow(response.body)
        } else {
            console.log(response)
            $tool.notify(config.name, "接口返回出错", response);
        }
    } catch (error) {
        console.log(error)
        $tool.notify(config.name, "接口查询错误", error);
    }
}

function parse_flow(data) {
    let regex = /(\d+),(\d+),(\d+),\d+/
    let result = regex.exec(data)
    if(result){
        //console.log(result)
        try {
            let used = format_flow(result[2])
            let all = format_flow(result[1])
            let msg = `已使用: ${used}, 共计: ${all}`
            console.log(msg)
            $tool.notify(config.name, config.title, msg);
        } catch (error) {
            console.log(error)
        }
    }
}

function format_flow(number, digits=3) {
    let units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "BB"]
    let index = 0
    while (number >= 1024) {
        number /= 1024
        index++
    }
    return parseFloat(number.toFixed(digits)) + units[index]
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
            shadowrocket: 'undefined' !== typeof $rocket,
            node: 'undefined' !== typeof module && !!module.exports
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
        // if (options.headers) {
        //     // delete options.headers['Content-Type']
        //     delete options.headers['Content-Length']
        //     if (env.app.quanx) {
        //         options.opts = options.opts || {}
        //         Object.assign(options.opts, { hints: false })
        //     } else if (env.app.surge || env.app.loon) {
        //         Object.assign(options.headers, { 'X-Surge-Skip-Scripting': false })
        //     }
        // }
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


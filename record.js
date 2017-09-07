/**
 * This script generates a movie file from parameter file.
 *
 * Command Example:
 * node examples/param_example1.json
 */

const Chromy = require('chromy')
const fs = require('fs')
const startServer = require('./src/server/server')

const args = process.argv

let additionalParams = null
if (args.length > 2) {
  let file = args[2]
  let json = fs.readFileSync(file)
  additionalParams = JSON.parse(json)
}

const chromyOpts = {visible: true}
if (process.env.CHROME_PATH) {
  chromyOpts['chromePath'] = process.env.CHROME_PATH
}
const chromy = new Chromy(chromyOpts)

async function onReceive (params) {
  console.log('receive:', params)
  let data = params[0]

  if (data.cmd === 'prepare') {
    if (additionalParams !== null) {
      let s = 'window.store.state.batchParams = JSON.parse(\'' + JSON.stringify(additionalParams) + '\')'
      await chromy.evaluate(s)
    }
    return additionalParams
  } else if (data.cmd === 'initialized') {
    await chromy.evaluate(function () {
      document.getElementById('btn-record').click()
    })
  } else if (data.cmd === 'script_onload') {
    // do nothing.
  } else if (data.cmd === 'exit') {
    console.log('exit')
    await chromy.close()
  } else {
    console.log('unknown command')
    console.log(data)
  }
}

async function recording () {
  return chromy.chain()
    .console(msg => {
      console.log(msg)
    })
    .goto('http://localhost:8000/index.html')
    .sleep(100)
    .receiveMessage(onReceive)
    .sleep(100)
    .evaluate(async _ => {
      await window.onBatch()
    })
    .sleep(4000)
    .end()
    .catch(e => {
      console.log(e)
    })
    .then(_ => chromy.close())
}

async function main () {
  const server = startServer()
  try {
    await recording()
  } finally {
    server.close()
  }
}

main()

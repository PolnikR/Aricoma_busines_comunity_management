import { mkdir, writeFile } from 'node:fs/promises'

// Connect only to a dedicated local debugging instance, never the daily browser profile.
export async function openBrowser(port = 9340) {
  const endpoint = `http://127.0.0.1:${port}`
  const target = await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json())
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  const errors = []
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 15000)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      clearTimeout(entry.timeout)
      if (message.error) entry.reject(new Error(message.error.message))
      else entry.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry)
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params
      const url = new URL(request.url)
      const config = url.pathname === '/config.js'
      // UI verification uses the existing documented auth-off mode and empty provider
      // inventory, served only to this isolated tab. No real login or backend is touched.
      const body = config ? 'window.__APP_CONFIG__ = {AUTH_ENABLED:"false"};' : '{"providers":[]}'
      void send('Fetch.fulfillRequest', {
        requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: config ? 'text/javascript' : 'application/json' }],
        body: Buffer.from(body).toString('base64'),
      }).catch(error => errors.push(error.message))
    }
  })
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Fetch.enable', { patterns: [
    { urlPattern: 'http://127.0.0.1:5177/config.js' },
    { urlPattern: 'http://127.0.0.1:5177/api/*' },
  ] })
  const read = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  }
  const settle = () => read('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))')
  let initScript
  return {
    send, read, settle, errors,
    async viewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      await settle()
    },
    async load(url, { theme = 'light', language = 'en', expanded = true, density = 'auto' } = {}) {
      if (initScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: initScript })
      const source = `try {localStorage.setItem('app-theme', ${JSON.stringify(theme)});localStorage.setItem('app-language', ${JSON.stringify(language)});localStorage.setItem('app-sidebar-expanded', ${JSON.stringify(String(expanded))});localStorage.setItem('abco.dashboard.kpiDensity', ${JSON.stringify(density)});} catch {}`
      initScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source })).identifier
      await send('Page.navigate', { url })
      for (let i = 0; i < 150; i++) {
        const ready = await read(`document.readyState === 'complete' && !!document.querySelector('.operations-dashboard, .analysis-grid') && !!document.querySelector('h1') && !document.querySelector('h1').textContent.includes('dashboard.')`)
        if (ready) { await read('document.fonts.ready.then(() => true)'); await settle(); return }
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      throw new Error(`Dashboard did not load: ${url}`)
    },
    async click(selector) {
      const point = await read(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Missing target'); const r = element.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
      await settle()
    },
    async screenshot(file) {
      await mkdir(file.substring(0, file.lastIndexOf('/')), { recursive: true })
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      await writeFile(file, Buffer.from(data, 'base64'))
    },
    async close() {
      try { await send('Page.close') } catch { /* Closing the page can close the socket first. */ }
      socket.close()
      for (const entry of pending.values()) { clearTimeout(entry.timeout); entry.reject(new Error('Browser closed')) }
    },
  }
}

export const measure = `(() => {
  const rect = element => {const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scrollWidth:element.scrollWidth,scrollHeight:element.scrollHeight,clientWidth:element.clientWidth,clientHeight:element.clientHeight};};
  const host = document.querySelector('.dashboard-host') || document.querySelector('main');
  const dashboard = document.querySelector('.operations-dashboard') || document.querySelector('main');
  return {viewport:[innerWidth,innerHeight],document:rect(document.documentElement),host:rect(host),dashboard:rect(dashboard),panels:[...dashboard.querySelectorAll('.dashboard-panel, .analysis-grid > .panel')].map(element=>({title:element.querySelector('h2')?.textContent,...rect(element)}))};
})()`

<template>
  <div id="app" style="position:relative">
    <!-- Sol küçük çizim paneli -->
    <Toolbar
      :mode="drawMode"
      @set-mode="setMode"
      @undo="undoDraw"
      @clear="clearDraw"
    />

    <!-- Grafik -->
    <trading-vue
      ref="tv"
      v-if="tv"
      :data="tv"
      :overlays="[DrawOverlay]"
      :toolbar="true"
      :width="w"
      :height="h"
      :title-txt="'BTCUSDT'"
      @click.native="onChartClick"
    />

    <div v-else style="color:#8fa3b8; padding:16px">Yükleniyor…</div>
  </div>
</template>

<script>
import axios from 'axios'
import TradingVue from 'trading-vue-js'
import Toolbar from './components/Toolbar.vue'
import DrawOverlay from './overlays/DrawOverlay.js'

// Binance ms verir, TradingVue ms kullanır -> /1000 yok
function mapBinanceToTV (klines) {
  return klines.map(k => [ k[0], +k[1], +k[2], +k[3], +k[4], +k[5] ])
}

export default {
  name: 'App',
  components: { TradingVue, Toolbar },
  data () {
    return {
      tv: null,
      w: window.innerWidth,
      h: window.innerHeight,

      drawMode: 'trend',     // 'trend' | 'ray' | 'hline' | 'vline'
      pendingPoint: null,

      drawData: {
        segments: [],        // trendlines: [ [t1,p1,t2,p2], ... ]
        rays: [],            // rays:       [ [t1,p1,t2,p2], ... ]
        hlines: [],          // hlines:     [ [price], ... ]
        vlines: []           // vlines:     [ [time], ... ]
      },

      // template'te :overlays="[DrawOverlay]" için expose ediyoruz
      DrawOverlay
    }
  },

  created () {
    window.addEventListener('resize', this.onResize)
    this.loadData()
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize)
  },

  methods: {
    setMode (m) { this.drawMode = m },

    onResize () {
      this.w = window.innerWidth
      this.h = window.innerHeight
    },

    async loadData () {
      const { data } = await axios.get('/binance/api/v3/klines', {
        params: { symbol: 'BTCUSDT', interval: '5m', limit: 500 }
      })
      const candles = mapBinanceToTV(data)

      this.tv = {
        chart:   { type: 'Candles', data: candles },
        onchart: [
          { name: 'Draw', type: 'DrawOverlay', data: this.drawData }
        ],
        offchart: []
      }
    },

    onChartClick (ev) {
      // TradingVue chart helper
      const chartRef =
        (this.$refs.tv && this.$refs.tv.$refs && this.$refs.tv.$refs.chart) ||
        (this.$refs.tv && this.$refs.tv.$children && this.$refs.tv.$children[0])
      const $p = chartRef && chartRef.$p
      if (!$p) return

      const t = $p.screen2x(ev.offsetX)   // time (ms)
      const p = $p.screen2y(ev.offsetY)   // price

      if (this.drawMode === 'hline') {
        this.drawData.hlines.push([p])
        return this.refreshOverlay()
      }
      if (this.drawMode === 'vline') {
        this.drawData.vlines.push([t])
        return this.refreshOverlay()
      }
      if (this.drawMode === 'ray') {
        if (!this.pendingPoint) this.pendingPoint = [t, p]
        else {
          const [t1, p1] = this.pendingPoint
          this.drawData.rays.push([t1, p1, t, p])
          this.pendingPoint = null
          return this.refreshOverlay()
        }
      }
      if (this.drawMode === 'trend') {
        if (!this.pendingPoint) this.pendingPoint = [t, p]
        else {
          const [t1, p1] = this.pendingPoint
          this.drawData.segments.push([t1, p1, t, p])
          this.pendingPoint = null
          return this.refreshOverlay()
        }
      }
    },

    undoDraw () {
      const d = this.drawData
      if (this.drawMode === 'hline' && d.hlines.length) d.hlines.pop()
      else if (this.drawMode === 'vline' && d.vlines.length) d.vlines.pop()
      else if (this.drawMode === 'ray'   && d.rays.length)   d.rays.pop()
      else if (this.drawMode === 'trend' && d.segments.length) d.segments.pop()
      this.refreshOverlay()
    },

    clearDraw () {
      this.drawData.segments = []
      this.drawData.rays = []
      this.drawData.hlines = []
      this.drawData.vlines = []
      this.refreshOverlay()
    },

    refreshOverlay () {
      // referans değiştirerek yeniden çizdir
      this.tv = {
        ...this.tv,
        onchart: [
          { name: 'Draw', type: 'DrawOverlay', data: {
              segments: [...this.drawData.segments],
              rays:     [...this.drawData.rays],
              hlines:   [...this.drawData.hlines],
              vlines:   [...this.drawData.vlines]
          }}
        ]
      }
    }
  }
}
</script>

<style>
html, body, #app { height: 100%; margin: 0; background:#0e1b2a; }
</style>

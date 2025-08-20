<template>
  <div id="app" style="position:relative">
    <!-- Sol küçük çizim paneli -->
    <Toolbar
      :mode="drawMode"
      @set-mode="setMode"
      @undo="undoDraw"
      @clear="clearDraw"
      @markers-csv-loaded="onMarkersCsvLoaded"
      @clear-markers="onClearMarkers"
    />

    <!-- Chart + durum -->
    <div class="chart-wrap" style="position:relative">
      <trading-vue
        v-if="tv"
        ref="tv"
        :data="tv"
        :overlays="[DrawOverlay]"
        :toolbar="true"
        :width="w"
        :height="h"
        :title-txt="'BTCUSDT'"
        @click.native="onChartClick"
      />
      <div v-else style="color:#8fa3b8; padding:16px">
        Yükleniyor…
      </div>

      <!-- CSV timestamp marker overlay canvas -->
      <canvas
        v-if="tv"
        ref="overlayMarkers"
        style="position:absolute; inset:0; pointer-events:none; z-index 10;"
      ></canvas>
    </div>
  </div>
</template>


<script>
import axios from 'axios'
import TradingVue from 'trading-vue-js'
import Toolbar from './components/Toolbar.vue'
import DrawOverlay from './Overlays/DrawOverlay.js'

// === CSV timestamp marker overlay ===
import {
  createMarkersOverlay,
  parseMarkersCsv
} from './Overlays/MarkersOverlay'

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

      // overlay referansları
      markersOverlay: null,
      intervalMs: 5 * 60 * 1000, // 5m; aktif intervale göre güncelle
      DrawOverlay
    }
  },

  created () {
    window.addEventListener('resize', this.onResize)
    this.loadData()
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize)
    if (this._overlayRO) this._overlayRO.disconnect()
  },

  methods: {
    setMode (m) { this.drawMode = m },

    onResize () {
      this.w = window.innerWidth
      this.h = window.innerHeight
      // chart boyutu değişince markers overlay’i de yeniden çiz
      this.$nextTick(() => {
        this.markersOverlay && this.markersOverlay.resize()
        this.markersOverlay && this.markersOverlay.onViewportChange()
      })
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

      // TradingVue mount edildikten sonra markers overlay’i kur
      this.$nextTick(() => {
        this.initMarkersOverlay()
        // TV set edildikten SONRA:
this.$nextTick(() => {
  this.initMarkersOverlay();

  // Grafik verisinden ortadaki candle'ın openTime'ını al
  const arr = this.tv && this.tv.chart && this.tv.chart.data || [];
  if (arr.length) {
    const mid = Math.floor(arr.length / 2);
    const ts  = arr[mid][0];         // openTime (ms)
    // DEBUG: tek bir marker koy
    this.markersOverlay.setMarkers([
      { ts, side: 'up', color: '#ff0', label: 'debug' }
    ]);
    this.markersOverlay.onViewportChange();
  }
});

        // ilk çizim
        this.markersOverlay && this.markersOverlay.onViewportChange()
      })
    },

    // TradingVue chart helper ($p) erişimi
    getChartP () {
      const chartRef =
        (this.$refs.tv && this.$refs.tv.$refs && this.$refs.tv.$refs.chart) ||
        (this.$refs.tv && this.$refs.tv.$children && this.$refs.tv.$children[0])
      return chartRef && chartRef.$p
    },

initMarkersOverlay () {
  if (this.markersOverlay) return
  const canvas = this.$refs.overlayMarkers
  const $p = this.getChartP()
  if (!canvas || !$p) return

  // 🔧 PROJEKSİYON FALLBACK
const getXForTime = (ms) => {
  const $p = this.getChartP();
  if ($p.x2screen) return $p.x2screen(ms);
  if ($p.t2screen) return $p.t2screen(ms);
  if ($p.t2x)      return $p.t2x(ms);
  const arr = (this.tv?.chart?.data) || [];
  let lo=0, hi=arr.length-1, idx=-1;
  while (lo<=hi) { const mid=(lo+hi)>>>1;
    if (arr[mid][0]===ms) { idx=mid; break; }
    arr[mid][0] < ms ? (lo=mid+1) : (hi=mid-1);
  }
  if (idx<0) idx=Math.max(0, Math.min(arr.length-1, lo));
  return $p.i2x ? $p.i2x(idx) : (20 + idx*6);
};
const getYForPrice = (p) => {
  const $p = this.getChartP();
  if ($p.y2screen) return $p.y2screen(p);
  if ($p.p2screen) return $p.p2screen(p);
  if ($p.p2y)      return $p.p2y(p);
  return 40;
};


  this.markersOverlay = createMarkersOverlay({
    canvas,
    getXForTime,
    getYForPrice,
    getCandles: () => {
      const arr = (this.tv && this.tv.chart && this.tv.chart.data) || []
      return arr.map(row => ({
        openTime: row[0],
        open: row[1],
        high: row[2],
        low:  row[3],
        close:row[4]
      }))
    },
    intervalMs: this.intervalMs, // 5m = 300000
    yPlacement: 'high'
  })

  const ro = new ResizeObserver(() => {
    this.markersOverlay?.resize()
    this.markersOverlay?.onViewportChange()
  })
  ro.observe(canvas)
  this._overlayRO = ro

  // ilk çizimi zorla
  this.markersOverlay.resize()
  this.markersOverlay.onViewportChange()
},

    onChartClick (ev) {
      const $p = this.getChartP()
      if (!$p) return

      const t = $p.screen2x(ev.offsetX)   // time (ms)
      const p = $p.screen2y(ev.offsetY)   // price

      if (this.drawMode === 'hline') {
        this.drawData.hlines.push([p])
        this.refreshOverlay()
        return this.notifyMarkersRedraw()
      }
      if (this.drawMode === 'vline') {
        this.drawData.vlines.push([t])
        this.refreshOverlay()
        return this.notifyMarkersRedraw()
      }
      if (this.drawMode === 'ray') {
        if (!this.pendingPoint) this.pendingPoint = [t, p]
        else {
          const [t1, p1] = this.pendingPoint
          this.drawData.rays.push([t1, p1, t, p])
          this.pendingPoint = null
          this.refreshOverlay()
          return this.notifyMarkersRedraw()
        }
      }
      if (this.drawMode === 'trend') {
        if (!this.pendingPoint) this.pendingPoint = [t, p]
        else {
          const [t1, p1] = this.pendingPoint
          this.drawData.segments.push([t1, p1, t, p])
          this.pendingPoint = null
          this.refreshOverlay()
          return this.notifyMarkersRedraw()
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
      this.notifyMarkersRedraw()
    },

    clearDraw () {
      this.drawData.segments = []
      this.drawData.rays = []
      this.drawData.hlines = []
      this.drawData.vlines = []
      this.refreshOverlay()
      this.notifyMarkersRedraw()
    },

    refreshOverlay () {
      // referans değiştirerek yeniden çizdir (DrawOverlay için)
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
    },

    notifyMarkersRedraw () {
      // zoom/pan veya overlay değişimlerinde marker’ları da güncelle
      this.$nextTick(() => {
        this.markersOverlay && this.markersOverlay.onViewportChange()
      })
    },

    // === CSV Marker akışı ===
    onMarkersCsvLoaded (csvText) {
      const list = parseMarkersCsv(csvText)
      console.log('[markers] parsed', list.length, list.slice(0,3))
      if (!this.markersOverlay) this.initMarkersOverlay()
      this.markersOverlay && this.markersOverlay.setMarkers(list)
      this.markersOverlay && this.markersOverlay.onViewportChange()
},
    onClearMarkers () {
      this.markersOverlay && this.markersOverlay.setMarkers([])
    }
  }
}
</script>

<style>
html, body, #app { height: 100%; margin: 0; background:#0e1b2a; }
</style>

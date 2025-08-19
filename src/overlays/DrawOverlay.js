// src/overlays/DrawOverlay.js
export default {
  name: 'DrawOverlay',

  meta_info () {
    return { author: 'you', version: '1.0.0', desc: 'Trendline / Ray / HLine / VLine' }
  },

  use_for () { return ['DrawOverlay'] },

  draw () {
    const { ctx, layout } = this.$props
    const { x2screen, y2screen } = this.$props.$p

    const segs   = (this.$props.data && this.$props.data.segments) || []   // [t1,p1,t2,p2]
    const rays   = (this.$props.data && this.$props.data.rays) || []       // [t1,p1,t2,p2] (t2>t1 yönüyle uzat)
    const hlines = (this.$props.data && this.$props.data.hlines) || []     // [price]
    const vlines = (this.$props.data && this.$props.data.vlines) || []     // [time]

    // Trendlines
    ctx.lineWidth = 1
    ctx.strokeStyle = '#f1c40f'
    segs.forEach(([t1,p1,t2,p2]) => {
      ctx.beginPath()
      ctx.moveTo(x2screen(t1), y2screen(p1))
      ctx.lineTo(x2screen(t2), y2screen(p2))
      ctx.stroke()
    })

    // Rays (t1,p1 -> t2,p2 doğrultusunda sağa sonsuza)
    ctx.strokeStyle = '#ff6f61'
    rays.forEach(([t1,p1,t2,p2]) => {
      const x1 = x2screen(t1), y1 = y2screen(p1)
      const x2 = x2screen(t2), y2 = y2screen(p2)
      const dx = x2 - x1, dy = y2 - y1
      const br = layout.bottomright[0]   // sağ sınır x
      const k = dx === 0 ? 0 : (br - x1) / dx
      const xr = dx === 0 ? x1 : x1 + dx * Math.max(1, k)
      const yr = dx === 0 ? layout.bottomright[1] : y1 + dy * Math.max(1, k)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(xr, yr)
      ctx.stroke()
    })

    // Horizontal lines
    ctx.strokeStyle = '#00e5ff'
    hlines.forEach(([price]) => {
      const y = y2screen(price)
      ctx.beginPath()
      ctx.moveTo(layout.topleft[0], y)
      ctx.lineTo(layout.bottomright[0], y)
      ctx.stroke()
    })

    // Vertical lines
    ctx.strokeStyle = '#8e44ad'
    vlines.forEach(([time]) => {
      const x = x2screen(time)
      ctx.beginPath()
      ctx.moveTo(x, layout.topleft[1])
      ctx.lineTo(x, layout.bottomright[1])
      ctx.stroke()
    })
  }
}

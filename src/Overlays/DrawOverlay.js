// src/overlays/DrawOverlay.js
// Basit çizim overlay'i (trendline + yatay çizgi)

// Veri formatı:
// data = {
//   segments: [ [t1, p1, t2, p2], ... ],  // trendlines
//   hlines:   [ [price], ... ]            // horizontal lines
// }

export default {
    name: 'DrawOverlay',
  
    meta_info () {
      return {
        author: 'you',
        version: '1.0.0',
        desc: 'Simple drawing overlay (trendlines & hlines)'
      }
    },
  
    use_for () { return ['DrawOverlay'] },
  
    draw () {
      const { ctx, layout } = this.$props
      const { x2screen, y2screen } = this.$props.$p
  
      // 1) Trendlines
      const segs = (this.$props.data && this.$props.data.segments) || []
      ctx.lineWidth = 1
      ctx.strokeStyle = '#f1c40f'
      segs.forEach(s => {
        const [t1, p1, t2, p2] = s
        const x1 = x2screen(t1)
        const y1 = y2screen(p1)
        const x2 = x2screen(t2)
        const y2 = y2screen(p2)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })
  
      // 2) Horizontal lines
      const hls = (this.$props.data && this.$props.data.hlines) || []
      ctx.strokeStyle = '#00e5ff'
      hls.forEach(h => {
        const price = h[0]
        const y = y2screen(price)
        ctx.beginPath()
        ctx.moveTo(layout.topleft[0], y)
        ctx.lineTo(layout.bottomright[0], y)
        ctx.stroke()
      })
    }
  }
  
<template>
  <div class="panel">
    <!-- Çizim araçları -->
    <button :class="{active: mode==='trend'}" @click="$emit('set-mode','trend')">Trendline</button>
    <button :class="{active: mode==='ray'}"   @click="$emit('set-mode','ray')">Ray</button>
    <button :class="{active: mode==='hline'}" @click="$emit('set-mode','hline')">H‑Line</button>
    <button :class="{active: mode==='vline'}" @click="$emit('set-mode','vline')">V‑Line</button>

    <!-- Edit -->
    <button @click="$emit('undo')">Undo</button>
    <button @click="$emit('clear')">Clear</button>

    <!-- === Markers (CSV) === -->
    <div class="sep"></div>
    <button @click="$refs.csvFile.click()">Import Markers CSV</button>
    <input
      ref="csvFile"
      type="file"
      accept=".csv,text/csv"
      style="display:none"
      @change="onCsvPicked"
    />
    <button @click="$emit('clear-markers')">Clear Markers</button>
  </div>
</template>

<script>
export default {
  name: 'Toolbar',
  props: {
    mode: { type: String, default: 'trend' }
  },
  methods: {
    onCsvPicked(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.$emit('markers-csv-loaded', reader.result);
      };
      reader.readAsText(file);
      // aynı dosyayı tekrar seçtiğinde de change tetiklensin
      e.target.value = '';
    }
  }
}
</script>

<style scoped>
.panel {
  position: absolute;
  left: 80px;
  top: 60px;
  z-index: 9999;          /* üstte kalsın */
  display: flex;
  flex-direction: column;
  gap: 6px;

  background: rgba(15, 35, 54, 0.9);
  padding: 6px;
  border-radius: 6px;
  border: 1px solid #29445f;

  /* Canvas ile çakışmayı engelle: yalnızca butonlar tıklanabilir */
  pointer-events: none;
}
button {
  pointer-events: auto;   /* Butonlar tıklanabilir */
  background: transparent;
  color: #cce3ff;
  border: none;
  text-align: left;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
button.active { background: rgba(0,229,255,0.15); color:#00e5ff; }
button:hover  { background: rgba(255,255,255,0.10); }

.sep {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 4px 2px;
}
</style>

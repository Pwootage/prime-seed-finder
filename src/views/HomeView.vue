<script setup lang="ts">
import SeedFinderWorker from "@/lib/SeedFinderWorker?worker";
import {computed, ref} from "vue";
import {CRandom16} from "@/lib/CRandom16";
import {
  lookupTimer1Frames,
  lookupTimer2to4Frames,
  TIMER1_MAX,
  TIMER1_MIN,
  TIMER2TO4_MAX,
  TIMER2TO4_MIN
} from "@/lib/TimerLookupTables";

const worker = new SeedFinderWorker();


const seedStringHex = ref("00000000");
// const seedStringHex = ref("4CBFD3D");
const seed = computed(() => {
  const cleaned = seedStringHex.value.replace(/[^!0-9A-Fa-f]+/mg, '');
  return parseInt(cleaned, 16) & 0xFFFF_FFFF
});

const upcomingSeeds = computed(() => {
  const rng = new CRandom16(seed.value);
  const result: number[] = [];
  for (let i = 1; i <= 100; i++) {
    result.push(rng.seed);
    rng.next();
  }
  return result;
});

// seed finder
const progress = ref(0);
const checked = ref(0);
const running = ref(false);
const foundSeedNumber = ref<number>(0);
const index = ref<number>(0);

worker.addEventListener("message", (event) => {
  const type = event.data.type;
  if (type === "progress") {
    progress.value = event.data.progress;
    checked.value = event.data.checked;
  } else if (type === "found") {
    index.value = event.data.index;
    foundSeedNumber.value = event.data.seed;
    running.value = false;
  }
});

function findSeed(seed: number) {
  worker.postMessage({type: "find", seed});
  running.value = true;
}

function formatHex(num: number, chunkSize: number = 4): string {
  // num may be 'negative', because of how javascript works, so first we have to turn it into a positive number
  const paddedHex = (num >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const startingDigits = paddedHex.length % chunkSize;
  let result = paddedHex.slice(0, startingDigits) + " ";
  for (let i = startingDigits; i < paddedHex.length; i += chunkSize) {
    result += paddedHex.slice(i, i + chunkSize) + "\u00A0";
  }
  return result.trim();
}

function formatPercent(num: number): string {
  return (num * 100).toFixed(0) + "%";
}

function formatFloat(num: number): string {
  return num.toFixed(3);
}


</script>

<style scoped lang="scss">
.best {
  color: rgba(0, 255, 0, 0.5);
}

.worst {
  color: rgba(255, 0, 0, 0.5);
}
</style>

<template>
  <main>
    <div>
      <input type="text" v-model="seedStringHex" :disabled="running">
      Seed: {{ formatHex(seed) }}
    </div>

    <div>
      <div v-if="running">
        <span>Finding seed ... {{ formatPercent(progress) }} ({{ formatHex(checked) }} of {{
            formatHex(0xFFFF_FFFF)
          }})</span>
      </div>
      <div v-else>
        <button @click="findSeed(seed)">Find seed #</button>
        <span>
          Seed #:
          <span v-if="foundSeedNumber == seed">{{ formatHex(index) }} | {{ index }}</span>
          <span v-else>Unknown</span>
        </span>
      </div>
    </div>

    <div>
      <table>
        <tr>
          <th>Seed</th>
          <th>Next</th>
          <th>Float</th>
          <th>Round 1</th>
          <th>Round 2-4</th>
        </tr>
        <tr v-for="seed in upcomingSeeds" :key="seed">
          <td>{{ formatHex(seed) }}</td>
          <td>{{ new CRandom16(seed).current() }}</td>
          <td>{{ formatFloat(new CRandom16(seed).float()) }}</td>
          <td :class="{
            best: lookupTimer1Frames(seed) == TIMER1_MIN,
            worst: lookupTimer1Frames(seed) == TIMER1_MAX
          }">
            {{ lookupTimer1Frames(seed) }}
          </td>
          <td :class="{
            best: lookupTimer2to4Frames(seed) == TIMER2TO4_MIN,
            worst: lookupTimer2to4Frames(seed) == TIMER2TO4_MAX
          }">
            {{ lookupTimer2to4Frames(seed) }}
          </td>
        </tr>
      </table>
    </div>

  </main>
</template>

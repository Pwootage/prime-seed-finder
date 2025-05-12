<script setup lang="ts">
import SeedFinderWorker from "@/lib/SeedFinderWorker?worker";
import { computed, ref } from "vue";
import { CRandom16 } from "@/lib/CRandom16";
import {
  lookupTimer1Frames,
  lookupTimer2to4Frames,
  TIMER1_MAX,
  TIMER1_MIN,
  TIMER2TO4_MAX,
  TIMER2TO4_MIN
} from "@/lib/TimerLookupTables";

interface SeedData {
  type: 'seed';
  seed: number;
  index: number;
  value: number;
  float: number;
  timer1: number;
  timer2to4: number;
}

type FilteredSeedData = SeedData | {
  type: 'skip';
  count: number;
};

const worker = new SeedFinderWorker();

const seedStringHex = ref("00000000");
// const seedStringHex = ref("4CBFD3D");
const seed = computed(() => {
  const cleaned = seedStringHex.value.replace(/[^!0-9A-Fa-f]+/mg, '');
  return parseInt(cleaned, 16) & 0xFFFF_FFFF
});
const okWindow = ref(5);
const filterOnlyUsefulSeeds = ref(true);
const seedsToSearch = ref(100000);

const seedsToShow = 200;
const upcomingSeeds = computed(() => {
  const rng = new CRandom16(seed.value);
  const result: SeedData[] = [];
  for (let i = 1; i <= seedsToShow; i++) {
    result.push({
      type: 'seed',
      index: i,
      seed: rng.seed,
      value: rng.current(),
      float: rng.float(),
      timer1: lookupTimer1Frames(rng.seed),
      timer2to4: lookupTimer2to4Frames(rng.seed)
    });
    rng.next();
  }
  return result;
});

const relevantSeeds = computed(() => {
  const rng = new CRandom16(seed.value);
  const result: FilteredSeedData[] = [];
  let skipped = 0;
  let found = 0;
  for (let i = 0; i < seedsToSearch.value; i++) {
    const seed: SeedData = {
      type: 'seed',
      index: i,
      seed: rng.seed,
      value: rng.current(),
      float: rng.float(),
      timer1: lookupTimer1Frames(rng.seed),
      timer2to4: lookupTimer2to4Frames(rng.seed)
    };
    let relevant = false;
    if (seed.timer1 == TIMER1_MIN) {
      relevant = true;
    } else if (seed.timer1 <= TIMER1_MIN + okWindow.value) {
      relevant = true;
    } else if (seed.timer2to4 == TIMER2TO4_MIN) {
      relevant = true;
    } else if (seed.timer2to4 <= TIMER2TO4_MIN + okWindow.value) {
      relevant = true;
    }
    if (relevant) {
      found++;
      if (skipped > 0) {
        result.push({ type: "skip", count: skipped });
        skipped = 0;
      }
      result.push({ ...seed });
    } else {
      skipped++;
    }
    rng.next();
    if (found >= seedsToShow) {
      break;
    }
  }
  return result
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
  worker.postMessage({ type: "find", seed });
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

.ok {
  color: rgba(255, 255, 0, 0.5);
}

.worst {
  color: rgba(255, 0, 0, 0.5);
}

.skip {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  padding-left: 4em;
}
</style>

<template>
  <main>
    <div>
      <input type="text" v-model="seedStringHex" :disabled="running">
      Seed: {{ formatHex(seed) }}
      <span v-if="running">
        <span>Finding seed ... {{ formatPercent(progress) }} ({{ formatHex(checked) }} of {{
          formatHex(0xFFFF_FFFF)
          }})</span>
      </span>
      <span v-else>
        <button v-if="foundSeedNumber != seed" @click="findSeed(seed)">Find absolute #</button>
        <span v-else>
          Absolute Seed #:
          <span v-if="foundSeedNumber == seed">{{ formatHex(index) }} | {{ index }}</span>
          <span v-else>Unknown</span>
        </span>
      </span>
    </div>

    <div>
      <label>
        <input type="checkbox" v-model="filterOnlyUsefulSeeds" />
        Show within
      </label>
      <label>
        <input type="number" v-model="okWindow" :disabled="running" min="0" :max="TIMER2TO4_MAX - TIMER2TO4_MIN" />
        Frames
      </label>
      <label>
        <input type="number" v-model="seedsToSearch" :disabled="running" />
        Seeds to search
      </label>
    </div>

    <div>
      <table>
        <tbody>
          <tr>
            <th>#</th>
            <th>Seed</th>
            <th>Next</th>
            <th>Float</th>
            <th>Round 1</th>
            <th>Round 2-4</th>
          </tr>
          <tr v-for="seed in (filterOnlyUsefulSeeds ? relevantSeeds : upcomingSeeds)" :key="seed.index">
            <template v-if="seed.type == 'skip'">
              <td colspan="6" class="skip">
                <span>...{{ seed.count }} seeds...</span>
              </td>
            </template>
            <template v-else>
              <td>{{ seed.index }}</td>
              <td>{{ formatHex(seed.seed) }}</td>
              <td>{{ seed.value }}</td>
              <td>{{ formatFloat(seed.float) }}</td>
              <td :class="{
                best: seed.timer1 == TIMER1_MIN,
                ok: seed.timer1 > TIMER1_MIN && seed.timer1 <= TIMER1_MIN + okWindow,
                worst: seed.timer1 == TIMER1_MAX
              }">
                {{ seed.timer1 }}
              </td>
              <td :class="{
                best: seed.timer2to4 == TIMER2TO4_MIN,
                ok: seed.timer2to4 > TIMER2TO4_MIN && seed.timer2to4 <= TIMER2TO4_MIN + okWindow,
                worst: seed.timer2to4 == TIMER2TO4_MAX
              }">
                {{ seed.timer2to4 }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

  </main>
</template>

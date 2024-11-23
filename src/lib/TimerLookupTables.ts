import {CRandom16} from "@/lib/CRandom16";


const FPS = 60.0;
const FRAME_TIME = 1.0 / FPS;

const timer1LookupTable: [number, number][] = [];
const timer2to4LookupTable: [number, number][] = [];

const rng = new CRandom16(0);
for (let i = 0; i <= 0xFFFF; i++) {
  rng.seed = i << 16;
  const timer1 = generateTimer(rng, 8, 13);
  timer1LookupTable.push([timer1, countFrames(timer1)]);
  const timer2to4 = generateTimer(rng, 15, 25);
  timer2to4LookupTable.push([timer2to4, countFrames(timer2to4)]);
}

function generateTimer(rng: CRandom16, min: number, max: number): number {
  const range = Math.fround(max - min);
  return Math.fround(rng.float() * range + min);
}

export const TIMER1_MIN = timer1LookupTable[0][1];
export const TIMER1_MAX = timer1LookupTable[timer1LookupTable.length - 1][1];
export const TIMER2TO4_MIN = timer2to4LookupTable[0][1];
export const TIMER2TO4_MAX = timer2to4LookupTable[timer2to4LookupTable.length - 1][1];

export function lookupTimer1Frames(seed: number): number {
  // just look it up in the table, it's much faster
  return timer1LookupTable[seed >>> 16][1];
}

export function lookupTimer2to4Frames(seed: number): number {
  // just look it up in the table, it's much faster
  return timer2to4LookupTable[seed >>> 16][1];
}

function countFrames(time: number): number {
  let time_frames = 0;
  let counter = time;
  while (counter > 0) {
    counter -= FRAME_TIME;
    time_frames++;
  }
  return time_frames;
}

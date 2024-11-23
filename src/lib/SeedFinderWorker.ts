import {CRandom16} from "@/lib/CRandom16";

self.addEventListener('message', (message) => {
  const {type} = message.data;
  if (type === 'find') {
    findSeed(message.data.seed);
  }
});

function findSeed(seed: number) {
  console.log('Finding seed:', seed);
  const rng = new CRandom16(0);
  let found = false;
  let i = 0;
  const progressInterval = (0x0100_0000) - 1;
  do {
    if ((i & progressInterval) === 0) {
      self.postMessage({type: 'progress', progress: i / 4294967296, checked: i});
    }
    if (rng.seed === seed) {
      self.postMessage({type: 'found', index: i, seed});
      found = true;
      break;
    }
    rng.next();
    i++;
  } while (rng.seed != 0 && !found); // it will loop back to 0 after 0xFFFF_FFFF
  if (!found) {
    console.error('Seed not found???? this should not be possible');
  }
}

export class CRandom16 {
  constructor(public seed: number) {
  }

  next() {
    this.seed = (Math.imul(this.seed, 0x41c64e6d) + 0x00003039) & 0xFFFF_FFFF;
  }

  current(): number {
   return (this.seed >> 16) & 0xffff;
  }

  float(): number {
    return Math.fround(this.current() * 0.000015259022);
  }

  rangeFloat(min: number, max: number) {
    return Math.fround(min) + this.float() * Math.fround(max - min);
  }

  rangeInt(min: number, max: number) {
    return min + (this.current() % ((max - min) + 1));
  }
}

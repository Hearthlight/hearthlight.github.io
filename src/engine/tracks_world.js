// Music for the big Party Mode world: one track per zone (and a boss fight).
// Same data format as the TRACKS table in audio.js (section 6), merged into it.
//
// 6/8 tracks use `beats: 2` (one dotted-quarter per beat) with `swing: 0.667`:
// the swing warp then puts steps 0, 1 and 2 of every beat exactly on its three
// triplet eighths (step 3 is left unused), so `X:4` is a dotted quarter,
// `X:2 Y:2` the lilting quarter–eighth and `X:1 Y:1 Z:2` three eighths.

/** n copies of a one-bar line, joined with bar lines. */
const rep = (bar, n) => Array(n).fill(bar).join(' | ');

export const WORLD_TRACKS = {
  // Windy Heights: a heather plateau of windmills and gliders. D mixolydian air
  // in a gentle 6/8 — breathy flute over a rolling harp arpeggio, open-fifth
  // bass and wind-chime bells; the flat seventh (C) is the tune’s signature.
  // Odd loops add a second flute in thirds under the B section.
  heights: {
    bpm: 84, beats: 2, swing: 0.667, key: 'D', mode: 'mixolydian', gain: 0.97, verb: 1.6,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Dadd9 | D | Cadd9 | D | G | D/F# | Em7 | Am7 | Dadd9 | D | Cadd9 | G | C | G/B | Am7 | Dsus4:1 D:1',
        lead: 'F#5:4 E5:2 D5:2 | A5:6 B5:2 | C6:4 A5:2 G5:2 | A5:8 | B5:4 A5:2 G5:2 | F#5:4 E5:2 D5:2 | E5:1 F#5:1 G5:2 B5:4 | A5:6 _:2 | F#5:4 E5:2 D5:2 | A5:6 B5:2 | C6:4 E6:2 D6:2 | D6:4 B5:2 G5:2 | C6:2 B5:2 A5:2 G5:2 | G5:4 B5:2 D6:2 | C6:1 B5:1 A5:2 G5:2 E5:2 | D5:6 A5:2',
      },
      B: {
        chords: 'G | G | D/F# | D/F# | Em7 | Em7 | C | D | G | G | Bm7 | Em7 | C | C | Am7 | C',
        lead: 'B5:4 D6:2 B5:2 | A5:1 B5:1 A5:2 G5:4 | F#5:4 A5:2 D6:2 | C6:6 A5:2 | B5:4 G5:2 E5:2 | G5:1 A5:1 B5:2 D6:4 | E6:4 D6:2 C6:2 | D6:6 A5:2 | B5:4 D6:2 B5:2 | A5:1 B5:1 A5:2 G5:4 | F#5:4 A5:2 B5:2 | G5:4 B5:2 E6:2 | E6:4 D6:2 C6:2 | G5:2 A5:2 B5:2 C6:2 | A5:6 G5:2 | E5:4 D5:2 E5:2',
        harm: 'G5:4 B5:2 G5:2 | F#5:1 G5:1 F#5:2 D5:4 | D5:4 F#5:2 A5:2 | A5:6 F#5:2 | G5:4 E5:2 B4:2 | E5:1 F#5:1 G5:2 B5:4 | C6:4 B5:2 A5:2 | A5:6 F#5:2 | G5:4 B5:2 G5:2 | F#5:1 G5:1 F#5:2 D5:4 | D5:4 F#5:4 | E5:4 G5:2 B5:2 | C6:4 B5:2 A5:2 | E5:2 F#5:2 G5:2 A5:2 | E5:6 D5:2 | C5:4 B4:2 C5:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.8, orn: 0.05 },
      { type: 'notes', src: 'harm', inst: 'flute', vel: 0.36, when: 'odd' },
      { type: 'arp', inst: 'pluck', alt: 'guitar', rate: 1, pat: [0, 2, 3, null, 4, 3, 2, null], vel: 0.26, range: [48], ring: 3, density: 0.92 },
      { type: 'arp', inst: 'bell', rate: 4, pat: [4, 2], vel: 0.16, range: [67], density: 0.3, only: ['B'] },
      { type: 'arp', inst: 'bell', rate: 4, pat: [2, 4], vel: 0.14, range: [67], density: 0.25, only: ['A'], when: 'odd' },
      { type: 'pad', inst: 'pad', vel: 0.42, range: [50, 67], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R---5---', vel: 0.5, range: [38, 50] },
      { type: 'perc', inst: 'shaker', pat: 'x.o.x.o.', vel: 0.3 },
      { type: 'perc', inst: 'brush', pat: '....x...', vel: 0.24, only: ['B'] },
    ],
  },

  // Bouncecap Woods: giant springy glowing mushrooms. Straight-16th E dorian
  // romp — staccato marimba leaping in octaves and fifths (the C♯ over A is
  // the dorian wink), tuned temple blocks (pitched woodblock), a hopping
  // octave bass and dry pluck chops; the B section hands the tune to the
  // pluck with glowing music-box sparkles.
  mushroom: {
    bpm: 104, beats: 4, swing: 0.5, key: 'E', mode: 'dorian', gain: 1.08, verb: 1.3,
    form: ['A', 'B', 'A2'],
    sections: {
      A: {
        chords: 'Em7 | A | Em7 | A | Gmaj7 | F#m7 | Em7:2 F#m7:2 | G:2 A:2',
        lead: 'E5:2 _:1 B4:1 E5:2 G5:2 B5:2 _:2 A5:2 G5:2 | F#5:2 _:2 C#6:2 _:2 A5:2 F#5:2 E5:4 | E5:2 _:1 B4:1 E5:2 G5:2 B5:2 _:2 D6:2 B5:2 | C#6:2 E6:2 _:2 C#6:1 D6:1 C#6:2 B5:2 A5:4 | B5:2 _:2 G5:2 _:2 D5:2 _:2 G5:2 A5:2 | A5:2 _:2 F#5:2 _:2 C#5:2 _:2 E5:2 F#5:2 | G5:2 E5:2 B4:2 E5:2 F#5:2 A5:2 C#6:2 E6:2 | D6:3 B5:1 G5:2 B5:2 A5:2 _:2 E5:4',
        blocks: rep('G4:2 _:4 C4:2 _:2 G4:1 G4:1 C4:2 _:2', 8),
      },
      B: {
        chords: 'Gmaj7 | A/G | F#m7 | Bm7 | Gmaj7 | A/G | F#m7 | B7sus4:2 B7:2',
        lead: 'D6:3 B5:1 _:2 F#5:2 G5:3 A5:1 B5:4 | C#6:3 A5:1 _:2 E5:2 A5:4 _:4 | C#6:3 A5:1 _:2 F#5:2 E5:2 F#5:2 A5:2 C#6:2 | D6:4 B5:2 F#5:2 B5:8 | D6:3 B5:1 _:2 F#5:2 G5:3 A5:1 B5:4 | E6:3 C#6:1 _:2 A5:2 C#6:4 _:4 | B5:2 A5:2 F#5:2 A5:2 C#6:2 B5:2 A5:2 F#5:2 | E5:2 _:2 F#5:2 _:2 D#5:2 F#5:2 A5:2 B5:2',
        blocks: rep('C4:2 _:6 G4:2 _:4 A4:1 G4:1', 8),
      },
      A2: {
        chords: 'Em7 | A | Em7 | A | Gmaj7 | F#m7 | Em7:2 F#m7:2 | G:2 A:2',
        lead: 'E5:2 _:1 B4:1 E5:2 G5:2 B5:2 _:2 A5:2 G5:2 | F#5:2 _:2 C#6:2 _:2 A5:2 F#5:2 E5:4 | E5:2 _:1 B4:1 E5:2 G5:2 B5:2 _:2 D6:2 B5:2 | C#6:2 E6:2 _:2 E6:1 F#6:1 E6:2 C#6:2 A5:4 | B5:2 _:2 G5:2 _:2 D5:2 _:2 G5:2 A5:2 | A5:2 _:2 F#5:2 _:2 C#5:2 _:2 E5:2 F#5:2 | G5:2 E5:2 B4:2 E5:2 F#5:2 A5:2 C#6:2 E6:2 | D6:3 B5:1 G5:2 B5:2 A5:2 C#6:2 E6:4',
        blocks: rep('G4:2 _:4 C4:2 _:2 G4:1 G4:1 C4:2 _:2', 7) + ' | G4:2 _:2 C4:1 C4:1 G4:2 A4:1 G4:1 C4:1 C4:1 G4:2 A4:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.86, orn: 0.1, only: ['A', 'A2'] },
      { type: 'notes', src: 'lead', inst: 'pluck', vel: 0.74, orn: 0.06, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.42, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.2, density: 0.3, only: ['B'], when: 'odd' },
      { type: 'notes', src: 'blocks', inst: 'wood', vel: 0.36 },
      { type: 'arp', inst: 'musicbox', rate: 2, pat: [4, null, null, 5, null, null, 6, null], vel: 0.2, range: [72], density: 0.55, only: ['B'] },
      { type: 'comp', inst: 'pluck', pat: '..x.x.....x.x...', vel: 0.36, range: [57, 72], max: 3, strum: 0.004, only: ['A', 'A2'] },
      { type: 'bass', inst: 'bass', pat: ['R-..8-..R-..8-..', 'R-..8-..5-..a-..'], vel: 0.62, range: [40, 52] },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.4 },
    ],
  },

  // Frostpeak Glacier: crystalline ice fields, aurora at night. Slow F# minor
  // that leans lydian (Dmaj7♯11 — the G♯ over D). A music-box tune of rising
  // fourths, a glassy 16th shimmer below it (bell under the music box, music
  // box under the bells) and slow pads; no drums. Odd loops swap the timbres.
  glacier: {
    bpm: 66, beats: 4, swing: 0.5, key: 'F#', mode: 'minor', gain: 1.5, verb: 1.3,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'F#m9 | Dmaj7#11 | Amaj7 | E6 | F#m9 | Dmaj7#11 | Bm9 | C#7sus4:2 C#m7:2',
        lead: 'G#5:4 C#6:4 F#6:8 | E6:6 C#6:2 G#5:8 | _:4 A5:4 C#6:4 E6:4 | C#6:6 B5:2 G#5:8 | G#5:4 C#6:4 F#6:8 | E6:4 F#6:4 C#6:8 | D6:6 C#6:2 B5:4 F#5:4 | B5:8 G#5:8',
      },
      B: {
        chords: 'Dmaj7#11 | E6 | C#m7 | F#m9 | Bm9 | Amaj7 | Dmaj7#11 | C#7sus4',
        lead: 'A5:6 G#5:2 F#5:4 C#6:4 | B5:8 G#5:4 E5:4 | E5:4 G#5:4 B5:4 E6:4 | F#6:6 E6:2 C#6:8 | D6:6 C#6:2 B5:4 A5:4 | C#6:6 B5:2 A5:4 E5:4 | F#5:4 A5:4 C#6:4 E6:4 | B5:8 _:4 F#5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', alt: 'bell', vel: 0.84, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', alt: 'musicbox', vel: 0.78, orn: 0.04, only: ['B'] },
      { type: 'arp', inst: 'bell', alt: 'musicbox', rate: 1, pat: [0, 2, 1, 3, 2, 1, 3, 4, 3, 2, 1, 2, 3, 1, 2, 0], vel: 0.12, range: [62], ring: 2, density: 0.62, only: ['A'] },
      { type: 'arp', inst: 'musicbox', alt: 'bell', rate: 1, pat: [0, 2, 1, 3, 2, 1, 3, 4, 3, 2, 1, 2, 3, 1, 2, 0], vel: 0.13, range: [62], ring: 2, density: 0.62, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.64, range: [45, 64], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R---------------', vel: 0.32, range: [37, 49] },
    ],
  },

  // Cloud Isles: islands afloat on a sea of cloud, hot-air balloons. A dreamy
  // E♭ lydian waltz — the F/E♭ (II over I) and its A♮ are the floating
  // colour. E-piano sings the A sections over an oom-pah-pah, bells take the
  // bridge with the e-piano an octave below and a music-box arpeggio.
  clouds: {
    bpm: 72, beats: 3, swing: 0.54, key: 'Eb', mode: 'lydian', gain: 1.18, verb: 1.5,
    form: ['A', 'B', 'A2'],
    sections: {
      A: {
        chords: 'Ebmaj7 | F/Eb | Gm7 | Cm7 | Ebmaj7 | F/Eb | Dm7 | Bbsus4:2 Bb:1',
        lead: 'G5:6 Bb5:2 D6:4 | C6:8 A5:4 | Bb5:6 G5:2 F5:4 | G5:8 _:4 | G5:6 Bb5:2 D6:4 | F6:6 D6:2 C6:4 | A5:6 C6:2 F5:4 | Eb5:8 D5:4',
      },
      B: {
        chords: 'Cm9 | Dm7 | Ebmaj7 | F | Gm7 | F/A | Bbmaj7 | Fsus4:2 F:1',
        lead: 'G5:6 F5:2 Eb5:4 | F5:8 A5:4 | Bb5:6 C6:2 D6:4 | C6:12 | D6:6 C6:2 Bb5:4 | A5:8 C6:4 | F6:6 D6:2 Bb5:4 | Bb5:8 A5:4',
      },
      A2: {
        chords: 'Ebmaj7 | F/Eb | Gm7 | Cm7 | Ebmaj7 | F/Eb | Cm7 | Bbsus4:2 Bb:1',
        lead: 'G5:6 Bb5:2 D6:4 | C6:8 A5:4 | Bb5:6 G5:2 F5:4 | G5:8 _:4 | G5:6 Bb5:2 D6:4 | C6:6 A5:2 F5:4 | G5:6 A5:2 Bb5:4 | Eb5:8 D5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'epiano', vel: 0.8, orn: 0.05, only: ['A', 'A2'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.2, density: 0.35, when: 'odd', only: ['A', 'A2'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.7, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'epiano', oct: -12, vel: 0.4, only: ['B'] },
      { type: 'comp', inst: 'epiano', pat: '....x---x---', vel: 0.34, range: [55, 70], max: 3, strum: 0.012, only: ['A', 'A2'] },
      { type: 'arp', inst: 'musicbox', rate: 2, pat: [null, 2, 3, 4, 3, 2], vel: 0.2, range: [60], ring: 4, density: 0.75, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.36, range: [51, 70], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------5---', vel: 0.54, range: [39, 51] },
      { type: 'perc', inst: 'brush', pat: '....o...o...', vel: 0.3, when: 'odd' },
    ],
  },

  // Golden Steppe: rolling golden grass, herds, a huge sky. Pastoral G major
  // with a mixolydian F in the bridge: a wide flute tune over strummed nylon
  // guitar and a galloping shaker (the herds); marimba shadows the bridge.
  steppe: {
    bpm: 92, beats: 4, swing: 0.52, key: 'G', mode: 'major', gain: 1.0, verb: 1.5,
    form: ['A', 'A2', 'B'],
    sections: {
      A: {
        chords: 'G | Cadd9 | G/B | C | Em7 | D | Cadd9 | Dsus4:2 D:2',
        lead: 'D5:4 G5:4 B5:6 A5:2 | G5:8 E5:4 D5:4 | D5:4 G5:4 B5:4 D6:4 | E6:8 D6:4 C6:4 | B5:6 A5:2 G5:4 E5:4 | F#5:8 A5:4 D6:4 | E6:6 D6:2 C6:4 B5:4 | A5:12 _:4',
      },
      A2: {
        chords: 'G | Cadd9 | G/B | C | Em7 | D/F# | C:2 D:2 | G',
        lead: 'D5:4 G5:4 B5:6 A5:2 | G5:8 E5:4 D5:4 | D5:4 G5:4 B5:4 D6:4 | C6:8 E6:4 D6:4 | B5:6 A5:2 G5:4 B5:4 | A5:6 F#5:2 D5:8 | E5:4 G5:4 F#5:4 A5:4 | G5:12 _:4',
      },
      B: {
        chords: 'Em7 | C | G | D/F# | Em7 | F | C | D7sus4:2 D:2',
        lead: 'E5:4 G5:4 B5:8 | C6:6 B5:2 G5:4 E5:4 | D5:4 G5:4 B5:4 D6:4 | D6:6 C6:2 A5:8 | B5:4 G5:4 E5:4 G5:4 | C6:6 A5:2 F5:8 | E5:6 G5:2 C6:8 | C6:4 A5:4 F#5:4 A5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.78, orn: 0.05 },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.34, only: ['B'], when: 'odd' },
      { type: 'comp', inst: 'guitar', pat: 'X---x-o---o-x-o-', vel: 0.44, range: [50, 67], max: 4, strum: 0.018 },
      { type: 'pad', inst: 'pad', vel: 0.3, range: [55, 72], max: 4, when: 'odd' },
      { type: 'bass', inst: 'bass', pat: 'R-----..5-----a-', vel: 0.6, range: [38, 52] },
      { type: 'perc', inst: 'shaker', pat: 'x.oox.oox.oox.oo', vel: 0.3 },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.36, only: ['B'] },
    ],
  },

  // Red Canyon & the old mine: a cozy western shuffle in A dorian (D9 is the
  // dorian IV) with an E7 twang at the cadences. Nylon guitar sings the A
  // sections over "chick-a" plucks and a walking bass; the pluck takes the
  // syncopated bridge; woodblock clickety-clack like minecart wheels.
  canyon: {
    bpm: 100, beats: 4, swing: 0.6, key: 'A', mode: 'dorian', gain: 1.0, verb: 1.4,
    form: ['A', 'A2', 'B'],
    sections: {
      A: {
        chords: 'Am7 | D9 | Am7 | D9 | Cmaj7 | Bm7 | Am7:2 G:2 | E7sus4:2 E7:2',
        lead: 'E4:2 A4:2 C5:2 E5:4 D5:2 C5:2 A4:2 | F#4:4 A4:2 D5:2 C5:4 A4:4 | E4:2 A4:2 C5:2 E5:4 G5:2 E5:2 D5:2 | E5:6 D5:2 C5:2 A4:2 D5:4 | E5:4 G5:2 E5:2 C5:4 B4:4 | D5:4 F#5:2 D5:2 B4:8 | C5:2 B4:2 A4:2 C5:2 B4:2 G4:2 D5:4 | E5:6 D5:2 G#4:4 B4:4',
      },
      A2: {
        chords: 'Am7 | D9 | Am7 | D9 | Fmaj7 | E7 | Am7:2 D9:2 | Am7',
        lead: 'E4:2 A4:2 C5:2 E5:4 D5:2 C5:2 A4:2 | F#4:4 A4:2 D5:2 C5:4 A4:4 | E4:2 A4:2 C5:2 E5:4 A5:2 G5:2 E5:2 | F#5:6 E5:2 D5:4 A4:4 | A4:4 C5:2 E5:2 F5:4 E5:4 | D5:4 B4:2 G#4:2 E4:8 | A4:2 C5:2 E5:2 A5:2 F#5:4 D5:4 | E5:4 A4:4 _:8',
      },
      B: {
        chords: 'Cmaj7 | G | D9 | Am7 | Cmaj7 | G | Bm7 | E7',
        lead: 'G5:3 E5:3 C5:2 _:2 E5:2 G5:2 B5:2 | D6:4 B5:2 G5:2 _:4 D5:4 | F#5:3 A5:3 C6:2 _:2 A5:2 F#5:2 E5:2 | E5:8 _:4 C5:2 D5:2 | E5:3 G5:3 B5:2 _:2 C6:2 B5:2 G5:2 | B5:4 D6:2 B5:2 G5:4 _:2 D5:2 | F#5:3 D5:3 B4:2 _:2 D5:2 F#5:2 A5:2 | G#5:6 E5:2 D5:4 B4:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'guitar', vel: 0.9, orn: 0.04, only: ['A', 'A2'] },
      { type: 'notes', src: 'lead', inst: 'pluck', vel: 0.74, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'guitar', oct: -12, vel: 0.42, only: ['B'], when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: '....x.o.....x.o.', vel: 0.34, range: [55, 69], max: 3, strum: 0.006, only: ['A', 'A2'] },
      { type: 'comp', inst: 'guitar', pat: '....x-o-....x-o-', vel: 0.36, range: [52, 67], max: 3, strum: 0.012, only: ['B'] },
      {
        type: 'bass', inst: 'bass', vel: 0.68, range: [36, 52],
        pat: ['R---3---5---a---', 'R---5---8---a---', 'R---3---5---a---', 'R---5---8---a---',
          'R---5---8---5---', 'R---3---5---a---', 'R---5---R---a---', 'R---5---R---a---'],
      },
      { type: 'perc', inst: 'brush', pat: '....x.......x...', vel: 0.32 },
      { type: 'perc', inst: 'wood', pat: 'x.x.....x.x.....', vel: 0.2 },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.36, only: ['B'] },
    ],
  },

  // Sunscorch Dunes: dunes, oases, sandworms. D phrygian dominant (D E♭ F♯ G
  // A B♭ C — the augmented second E♭–F♯ is the spice) over a maqsum-style
  // hand-drum groove: kick "doum", clap "tek", tambourine jingles. Kalimba
  // snakes through the A section, a low oud-like pluck answers in B.
  // key/mode are G minor on purpose: that is the scale ornaments and bass
  // approach notes use (G harmonic minor = D phrygian dominant, bar F/F♯).
  desert: {
    bpm: 96, beats: 4, swing: 0.5, key: 'G', mode: 'minor', gain: 1.1, verb: 1.5,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'D | Eb:2 D:2 | D | Cm:2 D:2 | Gm | Cm | Eb:2 Cm:2 | Eb:2 D:2',
        lead: 'A4:2 D5:2 Eb5:2 F#5:2 G5:2 F#5:2 Eb5:2 D5:2 | Eb5:4 G5:2 Bb5:2 A5:6 _:2 | A4:2 D5:2 Eb5:2 F#5:2 A5:2 Bb5:2 A5:2 G5:2 | G5:3 F#5:1 Eb5:4 D5:8 | D5:2 G5:2 Bb5:2 D6:2 C6:2 Bb5:2 A5:2 G5:2 | Eb6:4 D6:2 C6:2 G5:8 | Bb5:2 G5:2 Eb5:2 G5:2 C6:3 Bb5:1 A5:4 | G5:2 F#5:2 Eb5:4 D5:8',
      },
      B: {
        chords: 'Gm | Eb | Cm:2 D:2 | D | Gm | Eb | Cm:2 Eb:2 | D7sus4:2 D7:2',
        lead: 'G4:4 A4:2 Bb4:2 C5:4 D5:4 | Eb5:6 D5:2 C5:2 Bb4:2 G4:4 | C5:4 Eb5:2 G5:2 F#5:6 Eb5:2 | D5:8 F#5:4 A5:4 | Bb5:4 A5:2 G5:2 D5:4 G5:4 | G5:6 F#5:1 G5:1 Bb5:4 G5:4 | Eb5:2 G5:2 C6:4 Bb5:2 G5:2 Eb5:4 | G5:4 A5:4 F#5:4 D5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'kalimba', alt: 'marimba', vel: 0.86, orn: 0.08, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'pluck', vel: 0.8, orn: 0.06, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: 12, vel: 0.3, density: 0.45, only: ['B'], when: 'odd' },
      { type: 'pad', inst: 'pad', vel: 0.34, range: [50, 67], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-....R.R-....a-', vel: 0.66, range: [38, 50] },
      { type: 'perc', inst: 'kick', pat: 'x.....o.x.......', vel: 0.44 },
      { type: 'perc', inst: 'clap', pat: '..x...x.....x...', vel: 0.28 },
      { type: 'perc', inst: 'tamb', pat: ['x.o.o.x.x.o.o.o.', 'x.o.o.x.x.o.xoxo'], vel: 0.26 },
    ],
  },

  // The Sunken City: ruins under shallow teal water, mist, old statues.
  // Spacious A dorian with an aeolian shadow (Fmaj7♯11, Dm9): a bell tune
  // full of rests whose music-box echo trails a dotted eighth behind, like a
  // reflection under water; low marimba drips; no drums.
  sunken: {
    bpm: 76, beats: 4, swing: 0.5, key: 'A', mode: 'dorian', gain: 1.35, verb: 1.5,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Am9 | D9 | Am9 | D9 | Fmaj7#11 | Em7 | Dm9 | Esus4:2 E:2',
        lead: '_:4 E5:4 B5:6 A5:2 | F#5:8 _:4 E5:4 | _:4 E5:4 C6:6 B5:2 | A5:8 _:4 F#5:2 A5:2 | B5:8 C6:4 E6:4 | D6:8 B5:4 G5:4 | F5:6 E5:2 D5:4 A5:4 | A5:8 G#5:8',
        // the lead shifted 3 steps later (no bar lines: notes straddle them)
        echo: '_:7 E5:4 B5:6 A5:2 F#5:8 _:4 E5:4 _:4 E5:4 C6:6 B5:2 A5:8 _:4 F#5:2 A5:2 B5:8 C6:4 E6:4 D6:8 B5:4 G5:4 F5:6 E5:2 D5:4 A5:4 A5:8 G#5:5',
      },
      B: {
        chords: 'Cmaj7 | Bm7 | Fmaj7#11 | Em7 | Cmaj7 | Bm7 | Fmaj7#11 | E7sus4:2 E:2',
        lead: 'G5:4 B5:4 E6:8 | D6:6 A5:2 B5:8 | E6:4 C6:4 B5:8 | G5:6 A5:2 B5:4 E5:4 | G5:4 C6:4 E6:8 | D6:6 B5:2 A5:8 | C6:6 B5:2 A5:4 E5:4 | A5:4 B5:4 G#5:8',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'bell', alt: 'musicbox', vel: 0.72, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'echo', inst: 'musicbox', vel: 0.24 },
      { type: 'notes', src: 'lead', inst: 'musicbox', alt: 'bell', vel: 0.8, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.16, density: 0.3, only: ['B'], when: 'odd' },
      { type: 'arp', inst: 'marimba', rate: 4, pat: [0, null, 3, 2], vel: 0.26, range: [57], density: 0.85 },
      { type: 'pad', inst: 'pad', vel: 0.6, range: [48, 67], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.4, range: [33, 45] },
    ],
  },

  // Coral Lagoon: a sunny turquoise atoll, pearls and sea turtles. Straight
  // 16ths in C (not the swung island calypso): a "steel pan" made of marimba
  // and kalimba in unison playing a 3+3+2 riff, syncopated guitar chops, a
  // tresillo octave bass and four-on-the-floor soca kick. The B section dives
  // under water: drums drop out, pads and kalimba bubbles, a rolled pan note.
  lagoon: {
    bpm: 108, beats: 4, swing: 0.5, key: 'C', mode: 'major', gain: 1.02, verb: 1.3,
    form: ['A', 'B', 'A'],
    sections: {
      A: {
        chords: 'C6 | Am7 | Dm7 | G7 | C6 | A7 | Dm7:2 G7:2 | C6:2 G7:2',
        lead: 'G5:3 E5:3 C6:2 _:2 A5:2 G5:2 E5:2 | C6:3 A5:3 E5:2 _:2 G5:2 A5:2 C6:2 | D6:3 C6:3 A5:2 _:2 F5:2 A5:2 D6:2 | B5:4 G5:2 D5:2 F5:4 _:4 | G5:3 E5:3 C6:2 _:2 A5:2 G5:2 E5:2 | C#6:3 A5:3 E5:2 _:2 G5:2 A5:2 C#6:2 | D6:3 F6:3 E6:2 D6:3 B5:3 G5:2 | C6:4 E6:2 C6:2 G5:4 _:4',
      },
      B: {
        chords: 'Fmaj7 | Em7 | Dm7 | Cmaj7 | Fmaj7 | Em7 | Dm7 | G7sus4:2 G7:2',
        lead: 'A5:6 C6:2 E6:8 | D6:4 B5:4 G5:8 | F5:6 A5:2 C6:4 D6:4 | E6:1 E6:1 E6:1 E6:1 E6:4 _:8 | A5:6 C6:2 F6:8 | E6:6 D6:2 B5:8 | C6:4 A5:4 F5:4 A5:4 | C6:6 B5:2 D6:1 D6:1 D6:1 D6:1 D6:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.72, orn: 0.05 },
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.5, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.18, density: 0.3, only: ['B'], when: 'odd' },
      { type: 'comp', inst: 'guitar', pat: '...x..x....x..x.', vel: 0.36, range: [55, 69], max: 3, strum: 0.01, only: ['A'] },
      { type: 'arp', inst: 'kalimba', rate: 2, pat: [0, 1, 2, 3, 4, 3, 2, 1], vel: 0.22, range: [60], density: 0.8, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.42, range: [53, 72], max: 4, only: ['B'] },
      { type: 'bass', inst: 'bass', pat: 'R-.8-.R.R-.5-.a-', vel: 0.66, range: [36, 50], only: ['A'] },
      { type: 'bass', inst: 'bass', pat: 'R-----..5-----..', vel: 0.5, range: [36, 50], only: ['B'] },
      { type: 'perc', inst: 'kick', pat: 'x...x...x...x...', vel: 0.36, only: ['A'] },
      { type: 'perc', inst: 'tamb', pat: '..x...x...x...x.', vel: 0.24, only: ['A'] },
      { type: 'perc', inst: 'shaker', pat: 'x..x..x.x..x..x.', vel: 0.26 },
    ],
  },

  // Whirlpool Straits: sailing through currents and squalls. A cozy D minor
  // sea shanty in 6/8 (see the note at the top): pluck sings the call,
  // guitar strums the jig rhythm, oom-pah bass, clap on the backbeat and a
  // brushed swell like waves. The chorus (B) turns to F major with a marimba
  // an octave below; A2 adds a kalimba unison and a new ending.
  straits: {
    bpm: 112, beats: 2, swing: 0.667, key: 'D', mode: 'minor', gain: 0.86, verb: 1.35,
    form: ['A', 'B', 'A2'],
    sections: {
      A: {
        chords: 'Dm | Dm | C | C | Dm | Dm | A7 | A7 | Dm | Dm | F | C | Bb | Gm | A7 | Dm',
        lead: 'D5:2 A4:2 D5:2 F5:2 | A5:4 G5:2 F5:2 | E5:2 C5:2 E5:2 G5:2 | C6:4 G5:2 E5:2 | D5:2 A4:2 D5:2 F5:2 | A5:4 D6:2 C6:2 | A5:2 G5:2 E5:2 C#5:2 | E5:4 _:2 A4:2 | D5:2 A4:2 D5:2 F5:2 | A5:1 Bb5:1 A5:2 G5:2 F5:2 | A5:2 C6:2 A5:2 F5:2 | G5:4 E5:2 C5:2 | D5:2 F5:2 Bb5:2 D6:2 | D6:1 C6:1 Bb5:2 A5:2 G5:2 | A5:2 E5:2 C#5:2 E5:2 | D5:4 _:2 A5:2',
      },
      B: {
        chords: 'F | F | C | C | Dm | Dm | A7 | A7 | Bb | Bb | F | C | Gm | A7 | Dm | A7',
        lead: 'C6:4 A5:2 F5:2 | A5:2 C6:2 F6:4 | E6:4 D6:2 C6:2 | G5:4 _:2 G5:2 | A5:2 A5:2 A5:2 F5:2 | D6:4 A5:2 F5:2 | E5:2 G5:2 A5:2 C#6:2 | E6:4 _:4 | D6:4 Bb5:2 F5:2 | D5:2 F5:2 Bb5:4 | C6:4 A5:2 F5:2 | G5:2 A5:2 G5:2 E5:2 | D5:2 G5:2 Bb5:2 D6:2 | C#6:4 E6:2 C#6:2 | D6:4 A5:2 F5:2 | E5:2 C#5:2 A4:4',
      },
      A2: {
        chords: 'Dm | Dm | C | C | Dm | Dm | A7 | A7 | Dm | Dm | F | C | Bb | A7 | A7 | Dm',
        lead: 'D5:2 A4:2 D5:2 F5:2 | A5:4 G5:2 F5:2 | E5:2 C5:2 E5:2 G5:2 | C6:4 G5:2 E5:2 | D5:2 A4:2 D5:2 F5:2 | A5:4 D6:2 C6:2 | A5:2 G5:2 E5:2 C#5:2 | E5:4 _:2 A4:2 | D5:2 A4:2 D5:2 F5:2 | A5:1 Bb5:1 A5:2 G5:2 F5:2 | C6:2 A5:2 F5:2 A5:2 | G5:1 A5:1 G5:2 E5:2 C5:2 | Bb4:2 D5:2 F5:2 Bb5:2 | A5:2 G5:2 E5:2 C#5:2 | E5:2 D5:2 C#5:2 E5:2 | D5:4 _:2 A4:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'pluck', vel: 0.84, orn: 0.05 },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.38, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.42, only: ['A2'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.15, density: 0.3, only: ['B'], when: 'odd' },
      { type: 'comp', inst: 'guitar', pat: 'X-x-x-x-', vel: 0.34, range: [50, 67], max: 4, strum: 0.016 },
      { type: 'pad', inst: 'pad', vel: 0.28, range: [53, 70], max: 3, only: ['B'], when: 'odd' },
      { type: 'bass', inst: 'bass', pat: ['R---5---', 'R---5-a-'], vel: 0.62, range: [38, 50] },
      { type: 'perc', inst: 'kick', pat: 'x.......', vel: 0.45 },
      { type: 'perc', inst: 'clap', pat: '....x...', vel: 0.34, only: ['B', 'A2'] },
      { type: 'perc', inst: 'brush', pat: ['..o...o.', '.oo...o.'], vel: 0.3 },
    ],
  },

  // Croakmire: a foggy bayou ruled by frog kings, fireflies. A lazy, heavily
  // swung G minor blues (12 bars, ♭VI–V turnaround): e-piano sings the first
  // chorus over offbeat guitar chanks, the guitar takes the second with blue
  // notes (D♭) over e-piano comping. Round bass, brushes, low woodblock
  // "croaks" and the odd firefly bell.
  marsh: {
    bpm: 88, beats: 4, swing: 0.62, key: 'G', mode: 'minor', gain: 0.98, verb: 1.5,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Gm9 | Cm9 | Gm9 | Gm7 | Cm9 | Cm9 | Gm9 | Gm7 | Ebmaj7 | D7 | Gm9:2 Cm9:2 | Gm7:2 D7:2',
        lead: '_:2 D5:2 F5:2 G5:4 F5:2 D5:4 | Eb5:6 C5:2 Bb4:8 | _:2 D5:2 F5:2 G5:4 Bb5:2 A5:2 G5:2 | F5:4 Db5:1 D5:3 _:8 | _:2 G5:2 Bb5:2 C6:4 Bb5:2 G5:4 | Eb6:6 D6:2 C6:4 Bb5:4 | _:2 D5:2 F5:2 G5:4 F5:2 D5:4 | Bb4:4 C5:2 Db5:2 D5:8 | G5:6 Bb5:2 D6:8 | C6:6 A5:2 F#5:8 | G5:4 F5:2 D5:2 Eb5:4 C5:4 | G4:6 _:2 F#4:4 A4:4',
        frog: '_:16 | _:16 | _:16 | _:8 C3:1 _:1 C3:2 _:2 G2:2 | _:16 | _:16 | _:16 | _:12 C3:1 _:1 G2:2 | _:16 | _:16 | _:16 | _:16',
      },
      B: {
        chords: 'Gm9 | Cm9 | Gm9 | G7 | Cm9 | Cm9 | Gm9 | Gm9 | Ebmaj7 | D7 | Gm9:2 Ebmaj7:2 | Am7b5:2 D7:2',
        lead: 'G4:3 Bb4:1 C5:2 Db5:2 D5:4 _:4 | Eb5:4 D5:2 C5:2 G4:8 | G4:3 Bb4:1 C5:2 Db5:2 D5:2 F5:2 G5:4 | B4:4 D5:2 F5:2 G5:4 F5:4 | Eb5:6 G5:2 Bb5:4 G5:4 | D5:6 Eb5:2 C5:8 | Bb4:4 A4:2 G4:2 _:2 D5:2 F5:4 | G5:8 F5:2 D5:2 Db5:2 C5:2 | Bb4:6 D5:2 G5:8 | F#5:6 E5:2 D5:4 C5:4 | Bb4:4 D5:4 G5:4 D5:4 | C5:4 Eb5:4 F#5:4 A5:4',
        frog: '_:16 | _:8 C3:1 _:1 C3:2 _:4 | _:16 | _:16 | _:16 | _:10 G2:1 _:1 C3:2 _:2 | _:16 | _:16 | _:16 | _:16 | _:16 | _:12 G2:1 _:1 G2:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'epiano', vel: 0.8, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'guitar', vel: 0.9, orn: 0.03, only: ['B'] },
      { type: 'comp', inst: 'guitar', pat: '....x-.o....x-..', vel: 0.34, range: [53, 67], max: 3, strum: 0.01, only: ['A'] },
      { type: 'comp', inst: 'epiano', pat: '....x-......x-..', vel: 0.32, range: [53, 67], max: 4, strum: 0.008, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.3, range: [50, 67], max: 4, when: 'odd' },
      {
        type: 'bass', inst: 'bass', vel: 0.7, range: [36, 50],
        pat: ['R-----5-8-----5-', 'R-----5-7-----a-', 'R-----5-8-----5-', 'R-----5-7-----a-',
          'R-----5-8-----5-', 'R-----5-7-----a-', 'R-----5-8-----5-', 'R-----5-7-----a-',
          'R-----5-8-----5-', 'R-----5-7-----a-', 'R-----5-R-----a-', 'R-----5-R-----a-'],
      },
      { type: 'notes', src: 'frog', inst: 'wood', vel: 0.42 },
      { type: 'arp', inst: 'bell', rate: 2, pat: [null, null, 4, null, null, 5, null, null], vel: 0.14, range: [74], density: 0.35, when: 'after' },
      { type: 'perc', inst: 'brush', pat: '....x..o....x..o', vel: 0.3 },
    ],
  },

  // Emberpeak: lava rivers, obsidian bridges, ash. E harmonic minor — tense
  // but warm: a galloping low bass ostinato, a soft kick heartbeat (lub-dub),
  // a minor marimba tune with the D♯ leading tone and dark pads. The B
  // section climbs over bubbling plucks towards a B7 that drops back into A.
  volcano: {
    bpm: 110, beats: 4, swing: 0.5, key: 'E', mode: 'minor', gain: 0.94, verb: 1.3,
    form: ['A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Em | Em | C | B7 | Em | Em:2 Am:2 | Am:2 C:2 | B7sus4:2 B7:2',
        lead: 'B4:4 E5:4 G5:2 F#5:2 E5:4 | D#5:4 E5:4 F#5:2 G5:2 A5:4 | G5:4 E5:4 C5:2 E5:2 G5:4 | F#5:6 D#5:2 B4:8 | B4:4 E5:4 G5:2 F#5:2 E5:4 | B5:4 G5:2 E5:2 C6:4 B5:4 | A5:2 C6:2 E6:4 G5:2 E5:2 C5:4 | E5:6 D#5:2 F#5:4 B4:4',
        low: rep('E2:2 E2:1 E2:1 B2:2 E2:2 G2:2 E2:2 F#2:2 D#2:2', 2) + ' | C2:2 C2:1 C2:1 G2:2 C2:2 E2:2 C2:2 D2:2 B1:2 | B1:2 B1:1 B1:1 F#2:2 B1:2 D#2:2 B1:2 A2:2 F#2:2 | ' +
          rep('E2:2 E2:1 E2:1 B2:2 E2:2 G2:2 E2:2 F#2:2 D#2:2', 2) + ' | A1:2 A1:1 A1:1 E2:2 A1:2 C2:2 C2:1 C2:1 G2:2 C2:2 | B1:2 B1:1 B1:1 F#2:2 E2:2 B1:2 B1:1 B1:1 D#2:2 F#2:2',
      },
      B: {
        chords: 'Am | Em/G | F#m7b5 | B7 | C | D | B7sus4 | B7',
        lead: 'E5:4 A5:4 C6:6 B5:2 | G5:6 A5:2 B5:8 | A5:4 C6:4 E6:4 C6:4 | D#6:6 C6:2 B5:8 | E6:6 D6:2 C6:4 E6:4 | F#6:6 E6:2 D6:4 A5:4 | E6:8 B5:4 E5:4 | D#5:4 F#5:4 A5:4 B5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.86, orn: 0.05 },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.34, only: ['B'], when: 'odd' },
      { type: 'notes', src: 'low', inst: 'bass', vel: 0.62 },
      { type: 'bass', inst: 'bass', pat: 'R-.R..R-R-.R..a-', vel: 0.62, range: [35, 47], only: ['B'] },
      { type: 'arp', inst: 'pluck', rate: 2, pat: [0, 1, 2, 1, 3, 2, 1, 2], vel: 0.2, range: [52], ring: 2, density: 0.8, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.34, range: [47, 64], max: 3 },
      { type: 'perc', inst: 'kick', pat: 'X..x....X..x....', vel: 0.5 },
      { type: 'perc', inst: 'wood', pat: '..........x..x..', vel: 0.16, when: 'odd' },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x...x.', vel: 0.2, only: ['B'] },
    ],
  },

  // Boss fights, anywhere in the world: heroic C minor (i–VI–VII with a
  // G7 leading tone). A driving 8th-note bass, four-on-the-floor kick, claps
  // and tambourine; the marimba states the hook (repeated G, leap to E♭),
  // the kalimba takes the rising B section with the marimba an octave below.
  // (World v7) the Glimmer Grotto: sea caves under the lighthouse. A slow,
  // echoing F# minor — kalimba drops over a deep pad, a bell answering from far
  // off, a dripping music-box arpeggio and a heartbeat bass; B climbs to the
  // relative major, a flute carrying the lighthouse’s old tune through the dark.
  // (World v7) the Rootway: a hidden valley of the Deepwood behind the falls, in
  // the long light of late afternoon. A dorian 6/8 lilt — kalimba over a harp-
  // like pluck, the raised sixth (F♯) its secret; the B section climbs into the
  // relative major with a warm flute, wood knocks like a woodpecker far off.
  rootway: {
    bpm: 80, beats: 2, swing: 0.667, key: 'A', mode: 'dorian', gain: 0.95, verb: 1.9,
    form: ['A', 'A', 'B'],
    sections: {
      A: {
        chords: 'Am | G | Am | Em7 | D | G | Am | Esus4:1 E:1',
        lead: 'E5:4 D5:2 C5:2 | D5:6 B4:2 | C5:2 D5:2 E5:2 A5:2 | G5:6 _:2 | F#5:4 E5:2 D5:2 | E5:2 D5:2 B4:4 | C5:4 B4:2 A4:2 | B4:6 _:2',
      },
      B: {
        chords: 'F | G | Am | Am | F | G | Esus4:1 E:1 | Am',
        lead: 'A5:4 C6:2 A5:2 | B5:4 D6:2 B5:2 | C6:6 B5:2 | A5:6 E5:2 | F5:2 G5:2 A5:2 C6:2 | D6:4 B5:2 G5:2 | A5:4 G#5:4 | A5:6 _:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.72, orn: 0.05, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.64, orn: 0.06, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.13, density: 0.4, when: 'odd' },
      { type: 'arp', inst: 'pluck', rate: 1, pat: [0, 2, 4, null, 3, 2, 1, null], vel: 0.26, range: [45], ring: 3, density: 0.9 },
      { type: 'pad', inst: 'pad', vel: 0.4, range: [48, 67], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R---5---', vel: 0.46, range: [33, 45] },
      { type: 'perc', inst: 'wood', pat: '......x.', vel: 0.12 },
      { type: 'perc', inst: 'shaker', pat: 'x.o.x.o.', vel: 0.16, only: ['B'] },
    ],
  },

  // (World v7) the Understudies’ big top: a breathless circus galop in C — marimba
  // chromatic runs over oom-pah bass and tambourine, the B section’s bells in thirds.
  bigtop: {
    bpm: 132, beats: 4, swing: 0.5, key: 'C', mode: 'major', gain: 0.92, verb: 1.2,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        chords: 'C | G7 | G7 | C | C | G7 | G7 | C',
        lead: 'E5:2 D#5:2 E5:2 G5:2 C6:4 G5:4 | F5:2 E5:2 F5:2 A5:2 D6:4 B5:4 | G5:2 F#5:2 G5:2 B5:2 D6:2 F6:2 D6:2 B5:2 | C6:4 G5:4 E5:4 C5:4 | E5:2 D#5:2 E5:2 G5:2 C6:4 E6:4 | D6:2 C#6:2 D6:2 F6:2 B5:4 G5:4 | F5:2 G5:2 A5:2 B5:2 D6:4 B5:4 | C6:8 _:8',
      },
      B: {
        chords: 'F | C | G7 | C | F | C | G7 | C',
        lead: 'A5:4 C6:4 F6:4 C6:4 | G5:4 C6:4 E6:4 C6:4 | B5:2 C6:2 D6:2 B5:2 G5:4 F5:4 | E5:4 G5:4 C6:8 | A5:2 B5:2 C6:2 D6:2 F6:4 C6:4 | E6:4 D6:2 C6:2 G5:8 | F5:2 A5:2 B5:2 D6:2 F6:4 D6:4 | C6:4 G5:4 C5:8',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.72, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.5, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'flute', oct: -12, vel: 0.3, only: ['B'] },
      { type: 'arp', inst: 'pluck', rate: 2, pat: [null, 2, null, 4, null, 2, null, 4], vel: 0.3, range: [55], density: 1 },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.55, range: [33, 45] },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.3 },
      { type: 'perc', inst: 'tamb', pat: '....x.......x...', vel: 0.28 },
    ],
  },

  // (World v7) the Old Mine: a dusty western lope in E minor — a flute over a
  // rolling guitar, a walking bass, wood blocks clip-clopping like a cart on rails.
  oldmine: {
    bpm: 104, beats: 4, swing: 0.56, key: 'E', mode: 'minor', gain: 0.94, verb: 1.5,
    form: ['A', 'A', 'B'],
    sections: {
      A: {
        chords: 'Em | C | D | Em | Em | C | B7 | Em',
        lead: 'E5:4 G5:4 B5:6 A5:2 | G5:4 E5:4 C5:8 | D5:4 F#5:4 A5:6 G5:2 | E5:12 _:4 | B5:4 A5:2 G5:2 E5:4 G5:4 | C6:6 B5:2 A5:4 G5:4 | F#5:4 A5:4 D#5:4 F#5:4 | E5:12 _:4',
      },
      B: {
        chords: 'G | D | Em | C | G | D | B7 | Em',
        lead: 'D6:4 B5:4 G5:8 | A5:4 F#5:4 D5:8 | E5:4 G5:4 B5:4 E6:4 | D6:8 C6:8 | B5:4 D6:4 G6:6 F#6:2 | E6:4 D6:4 A5:8 | B5:4 A5:4 F#5:4 D#5:4 | E5:16',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.7, orn: 0.07, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'guitar', vel: 0.62, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.12, density: 0.35, when: 'odd' },
      { type: 'arp', inst: 'guitar', rate: 2, pat: [0, 2, 4, 2, 3, 2, 4, 2], vel: 0.24, range: [48], ring: 2, density: 0.95 },
      { type: 'bass', inst: 'bass', pat: 'R---R-5-R---R-5-', vel: 0.5, range: [28, 40] },
      { type: 'perc', inst: 'wood', pat: 'x.x.x.x.x.x.x.x.', vel: 0.16 },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x...x.', vel: 0.14, only: ['B'] },
    ],
  },

  // (World v7) the Frostbell Halls: a crystalline waltz in B minor — a music box
  // and bells over a slow harp, the raised seventh (A♯) a shiver of cold.
  frostbell: {
    bpm: 96, beats: 3, swing: 0.5, key: 'B', mode: 'minor', gain: 0.9, verb: 2.6,
    form: ['A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Bm | G | D | A | Bm | Em | F#7 | Bm',
        lead: 'F#5:4 B5:4 D6:4 | D6:6 C#6:2 B5:4 | A5:4 F#5:4 A5:4 | C#6:8 E5:4 | F#5:4 B5:4 D6:4 | G6:6 F#6:2 E6:4 | C#6:4 E6:4 A#5:4 | B5:12',
      },
      B: {
        chords: 'G | D | Em | Bm | G | D | F#7 | Bm',
        lead: 'B5:4 D6:4 G6:4 | F#6:6 E6:2 D6:4 | E6:4 G6:4 B6:4 | F#6:12 | G6:4 F#6:4 E6:4 | D6:4 C#6:4 A5:4 | A#5:4 C#6:4 E6:4 | D6:4 C#6:4 B5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', vel: 0.72, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.5, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'flute', oct: -12, vel: 0.26, when: 'odd' },
      { type: 'arp', inst: 'pluck', rate: 1, pat: [0, 2, 4, 2, 4, 2], vel: 0.24, range: [47], ring: 3, density: 0.95 },
      { type: 'pad', inst: 'pad', vel: 0.44, range: [47, 66], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-----5-----', vel: 0.42, range: [30, 42] },
    ],
  },

  // (World v7, ch9) Hollowmoor Manor: a music box winding down in an empty ballroom — a
  // minor waltz, a bell on the half-bars, a pad like a draught under the door
  hollowmoor: {
    bpm: 80, beats: 3, swing: 0.5, key: 'E', mode: 'minor', gain: 0.9, verb: 3.0,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Em | Am | B | Em | C | Am | B | B7',
        lead: 'B4:4 E5:4 G5:4 | A5:8 G5:4 | F#5:4 D#5:4 B4:4 | E5:12 | G5:4 E5:4 C5:4 | A5:8 C6:4 | B5:4 A5:4 F#5:4 | D#5:12',
      },
      B: {
        chords: 'C | G | Am | Em | C | G | B | B',
        lead: 'E5:4 G5:4 C6:4 | B5:8 G5:4 | A5:4 C6:4 E6:4 | B5:12 | C6:4 B5:4 A5:4 | G5:4 F#5:4 E5:4 | D#5:8 F#5:4 | B4:12',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', vel: 0.5 },
      { type: 'notes', src: 'lead', inst: 'bell', oct: -12, vel: 0.14, when: 'odd' },
      { type: 'perc', inst: 'wood', pat: 'x.....x.....', vel: 0.2 },
      { type: 'pad', inst: 'pad', vel: 0.42, range: [47, 64], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R---5---5---', vel: 0.36, range: [28, 40] },
    ],
  },

  // (World v7, ch8) the Heartwood: a slow waltz inside a tree — marimba like knocking on
  // wood, a warm flute over it, a heartbeat on the kick
  heartwood: {
    bpm: 88, beats: 3, swing: 0.5, key: 'G', mode: 'dorian', gain: 0.92, verb: 2.4,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Gm | F | Eb | D | Gm | Bb | C | D',
        lead: 'G4:4 Bb4:4 D5:4 | C5:8 A4:4 | Bb4:4 G4:4 Eb5:4 | D5:12 | G5:4 F5:4 D5:4 | F5:8 D5:4 | Eb5:4 C5:4 A4:4 | D5:12',
      },
      B: {
        chords: 'Eb | F | Gm | D | Eb | F | Bb | D',
        lead: 'Bb4:4 C5:4 D5:4 | C5:4 D5:4 F5:4 | G5:8 F5:4 | F#5:12 | G5:4 F5:4 Eb5:4 | F5:4 Eb5:4 C5:4 | D5:8 Bb4:4 | A4:12',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.5 },
      { type: 'notes', src: 'lead', inst: 'flute', oct: 12, vel: 0.18, when: 'odd' },
      { type: 'perc', inst: 'kick', pat: 'x.....x.....', vel: 0.4 },
      { type: 'perc', inst: 'wood', pat: '....x.....x.', vel: 0.26 },
      { type: 'pad', inst: 'pad', vel: 0.38, range: [48, 64], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-----5-----', vel: 0.44, range: [30, 42] },
    ],
  },

  // (World v7, ch7) the Lantern Pagoda: a climbing pentatonic tune on a plucked koto,
  // a bamboo flute answering, temple blocks and a slow bell every other bar
  lanternpagoda: {
    bpm: 94, beats: 4, swing: 0.5, key: 'D', mode: 'major', gain: 0.92, verb: 2.2,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        chords: 'D | Bm | G | A | D | Bm | Em | A',
        lead: 'A4:4 B4:4 D5:8 | F#5:4 E5:4 D5:8 | B4:4 D5:4 E5:8 | A4:16 | D5:4 E5:4 F#5:8 | A5:4 F#5:4 E5:8 | D5:4 B4:4 A4:4 B4:4 | D5:16',
      },
      B: {
        chords: 'G | A | F#m | Bm | G | A | Bm | A',
        lead: 'B5:8 A5:8 | F#5:8 E5:8 | F#5:4 A5:4 B5:8 | D6:16 | B5:4 A5:4 F#5:8 | E5:4 F#5:4 A5:8 | F#5:4 E5:4 D5:4 B4:4 | A4:16',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'pluck', vel: 0.5 },
      { type: 'notes', src: 'lead', inst: 'flute', oct: 12, vel: 0.2, when: 'odd' },
      { type: 'perc', inst: 'wood', pat: 'x..x..x.x..x..x.', vel: 0.34 },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.36 },
      { type: 'notes', src: 'lead', inst: 'bell', oct: -12, vel: 0.14, when: 'even' },
      { type: 'pad', inst: 'pad', vel: 0.36, range: [50, 66], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R---5---R---5---', vel: 0.44, range: [30, 42] },
    ],
  },

  // (World v7, ch6) the Forge Heart: an anvil-chorus march in a minor key, hammers on
  // the off-beats, a brassy lead over rumbling bass
  forgeheart: {
    bpm: 112, beats: 4, swing: 0.5, key: 'C', mode: 'minor', gain: 0.95, verb: 1.6,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Cm | Cm | Ab | G | Cm | Fm | G | Cm',
        lead: 'C5:4 Eb5:4 G5:8 | F5:4 Eb5:4 D5:8 | Eb5:4 F5:4 Ab5:8 | G5:16 | C6:4 Bb5:4 G5:8 | Ab5:4 G5:4 F5:8 | D5:4 Eb5:4 F5:4 D5:4 | C5:16',
      },
      B: {
        chords: 'Ab | Bb | Eb | Cm | Ab | Bb | G | G7',
        lead: 'Eb5:8 Ab5:8 | F5:8 Bb5:8 | G5:4 Bb5:4 Eb6:8 | C6:16 | Ab5:4 C6:4 Eb6:8 | D6:8 Bb5:8 | B5:8 D6:8 | G5:16',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'guitar', vel: 0.5 },
      { type: 'notes', src: 'lead', inst: 'bell', oct: -12, vel: 0.22, when: 'odd' },
      { type: 'perc', inst: 'kick', pat: 'x...x...x...x...', vel: 0.5 },
      { type: 'perc', inst: 'wood', pat: '..x...x...x...x.', vel: 0.32 },
      { type: 'pad', inst: 'pad', vel: 0.38, range: [48, 64], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-R-5-R-R-R-5-R-', vel: 0.5, range: [28, 40] },
    ],
  },

  // (World v7, ch5) the Sunken Bell Temple: a slow swell of a 6/8 barcarolle, bells
  // under the water, the melody rising and falling like the tide
  sunkenbell: {
    bpm: 84, beats: 6, swing: 0.5, key: 'D', mode: 'dorian', gain: 0.9, verb: 2.8,
    form: ['A', 'B', 'A', 'B'],
    sections: {
      A: {
        chords: 'Dm | C | Bb | C | Dm | Am | Bb | A7',
        lead: 'A5:12 D6:12 | E6:8 D6:4 C6:12 | D6:12 F5:12 | G5:24 | A5:12 D6:12 | E6:8 F6:4 E6:12 | D6:8 C6:4 Bb5:12 | A5:24',
      },
      B: {
        chords: 'Bb | F | C | Dm | Bb | F | Gm | A7',
        lead: 'D6:12 F6:12 | E6:8 D6:4 C6:12 | E6:12 G6:12 | F6:24 | D6:12 F6:12 | A6:8 G6:4 F6:12 | E6:8 D6:4 E6:12 | C#6:24',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.55, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.42, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'musicbox', oct: 12, vel: 0.18, when: 'odd' },
      { type: 'arp', inst: 'kalimba', rate: 1, pat: [0, 2, 4, 5, 4, 2], vel: 0.26, range: [50], ring: 4, density: 0.9 },
      { type: 'pad', inst: 'pad', vel: 0.46, range: [45, 64], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-----5-----', vel: 0.4, range: [28, 40] },
    ],
  },

  grotto: {
    bpm: 78, beats: 4, swing: 0.5, key: 'F#', mode: 'minor', gain: 0.95, verb: 2.1,
    form: ['A', 'A', 'B'],
    sections: {
      A: {
        chords: 'F#m | Dmaj7 | Bm7 | C#7sus4:2 C#7:2 | F#m | Dmaj7 | Bm7 | C#7',
        lead: 'C#6:6 A5:2 F#5:8 | _:4 A5:2 B5:2 C#6:4 D6:4 | B5:6 A5:2 F#5:4 D5:4 | E5:8 _:8 | C#6:6 A5:2 F#5:8 | _:4 E6:2 D6:2 C#6:4 A5:4 | B5:4 D6:4 F#6:4 E6:4 | C#6:12 _:4',
      },
      B: {
        chords: 'A | E | F#m | D | A | E/G# | Bm7 | C#7sus4:2 C#7:2',
        lead: 'E6:6 C#6:2 A5:8 | B5:6 G#5:2 E5:8 | F#5:4 A5:4 C#6:4 F#6:4 | E6:8 D6:8 | C#6:6 E6:2 A6:8 | G#6:4 E6:4 B5:8 | D6:4 C#6:4 B5:4 F#5:4 | G#5:8 _:8',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.7, orn: 0.05, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.2, when: 'odd', only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.62, orn: 0.06, only: ['B'] },
      { type: 'arp', inst: 'musicbox', rate: 2, pat: [0, 2, 4, 2, 3, null, 1, null], vel: 0.18, range: [66], density: 0.7 },
      { type: 'pad', inst: 'pad', vel: 0.46, range: [45, 64], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------R---5---', vel: 0.46, range: [30, 42] },
      { type: 'perc', inst: 'wood', pat: '....x.......x...', vel: 0.14 },
    ],
  },

  // (World v7) Duchess Gloria’s theme: a pompous villain’s waltz in D minor —
  // oom-pah-pah pizzicato and tuba bass under a melodramatic flute doubled by
  // bells, a chromatic creep into the turnaround, then a bombastic B section in
  // the relative major, marimba and kalimba shouting the tune an octave up.
  villain: {
    bpm: 150, beats: 3, swing: 0.5, key: 'D', mode: 'minor', gain: 0.9, verb: 1.3,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Dm | A7 | Dm | A7 | Gm | Dm | E7 | A7',
        lead: 'D5:6 F5:3 A5:3 | C#6:6 A5:3 E5:3 | F5:4 E5:4 D5:4 | A4:9 _:3 | Bb5:6 A5:3 G5:3 | F5:6 E5:3 D5:3 | E5:3 F5:3 G#5:3 B5:3 | A5:6 _:3 A4:3',
      },
      B: {
        chords: 'F | C7 | Dm | Bbmaj7 | Gm | Dm | E7 | A7',
        lead: 'C6:4 A5:4 F5:4 | G5:4 Bb5:4 E6:4 | F6:6 E6:3 D6:3 | D6:9 _:3 | Bb5:3 A5:3 G5:3 D6:3 | F5:6 A5:3 D6:3 | G#5:3 B5:3 D6:3 E6:3 | C#6:6 A5:6',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.78, orn: 0.06, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.22, only: ['A'], when: 'odd' },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.86, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.4, only: ['B'] },
      { type: 'comp', inst: 'pluck', pat: '....x...x...', vel: 0.3, range: [55, 70], max: 3, strum: 0.006 },
      { type: 'pad', inst: 'pad', vel: 0.26, range: [50, 67], max: 3, only: ['B'] },
      { type: 'bass', inst: 'bass', pat: ['R-------5---', 'R-------3---'], vel: 0.66, range: [33, 45] },
      { type: 'perc', inst: 'wood', pat: 'x...........', vel: 0.34 },
      { type: 'perc', inst: 'tamb', pat: '....x...x...', vel: 0.2, only: ['B'] },
    ],
  },

  boss: {
    bpm: 128, beats: 4, swing: 0.5, key: 'C', mode: 'minor', gain: 0.84, verb: 1.2,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Cm | Ab | Bb | Cm | Cm | Ab:2 Bb:2 | Fm7:2 G7:2 | Cm:2 G:2',
        lead: 'G5:3 G5:1 C6:2 G5:2 Eb6:4 D6:2 C6:2 | C6:4 Ab5:4 Eb5:4 Ab5:4 | D6:3 D6:1 F6:2 D6:2 Bb5:4 C6:2 D6:2 | Eb6:8 D6:4 C6:4 | G5:3 G5:1 C6:2 G5:2 Eb6:4 D6:2 C6:2 | Ab5:4 C6:4 Eb6:4 D6:4 | C6:2 Ab5:2 F5:2 Ab5:2 B5:2 D6:2 F6:2 D6:2 | Eb6:4 C6:4 B5:4 G5:4',
      },
      B: {
        chords: 'Ab | Bb | Gm7 | Cm | Ab | Bb | Fm7:2 G7:2 | G7sus4:2 G7:2',
        lead: 'C6:6 Bb5:2 Ab5:4 C6:4 | D6:6 C6:2 Bb5:4 F5:4 | Bb5:4 D6:4 F6:4 D6:4 | Eb6:6 D6:2 C6:8 | Ab5:2 C6:2 Eb6:4 Ab5:2 C6:2 Eb6:4 | Bb5:2 D6:2 F6:4 Bb5:2 D6:2 F6:4 | Ab6:4 F6:4 G6:4 D6:4 | C6:4 D6:2 C6:2 B5:4 G5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.9, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.34, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.86, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.46, only: ['B'] },
      { type: 'comp', inst: 'pluck', pat: 'x..x..x.x..x..x.', vel: 0.28, range: [55, 70], max: 3, strum: 0.004 },
      { type: 'pad', inst: 'pad', vel: 0.34, range: [51, 70], max: 4, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.28, range: [51, 70], max: 4, only: ['A'], when: 'odd' },
      { type: 'bass', inst: 'bass', pat: ['R-R-R-R-R-R-8-R-', 'R-R-R-R-R-R-8-a-'], vel: 0.64, range: [36, 48] },
      { type: 'perc', inst: 'kick', pat: 'x...x...x...x...', vel: 0.5 },
      { type: 'perc', inst: 'clap', pat: '....x.......x...', vel: 0.42 },
      { type: 'perc', inst: 'tamb', pat: ['..x...x...x...x.', '..x...x...x.x.xx'], vel: 0.3 },
    ],
  },

  // Gloom invasions: a waystone under attack. D minor, driving but still
  // cozy — flute & marimba trade the tune over pumping bass, a strummed
  // guitar in eighths and a four-on-the-floor kick; B lifts to the relative
  // major before the A7 turnaround pulls it back into the fight.
  battle: {
    bpm: 132, beats: 4, swing: 0.5, key: 'D', mode: 'minor', gain: 0.84, verb: 1.1,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'Dm | Bb | C | Dm | Dm | Bb:2 C:2 | Gm7:2 A7:2 | Dm:2 A:2',
        lead: 'A5:3 A5:1 D6:2 A5:2 F6:4 E6:2 D6:2 | D6:4 Bb5:4 F5:4 Bb5:4 | E6:3 E6:1 G6:2 E6:2 C6:4 D6:2 E6:2 | F6:8 E6:4 D6:4 | A5:3 A5:1 D6:2 A5:2 F6:4 E6:2 D6:2 | Bb5:4 D6:4 C6:4 E6:4 | D6:2 Bb5:2 G5:2 Bb5:2 C#6:2 E6:2 G6:2 E6:2 | F6:4 D6:4 C#6:4 A5:4',
      },
      B: {
        chords: 'Bb | C | Am7 | Dm | Bb | C | Gm7:2 A7:2 | A7sus4:2 A7:2',
        lead: 'D6:6 C6:2 Bb5:4 D6:4 | E6:6 D6:2 C6:4 G5:4 | C6:4 E6:4 G6:4 E6:4 | F6:6 E6:2 D6:8 | Bb5:2 D6:2 F6:4 Bb5:2 D6:2 F6:4 | C6:2 E6:2 G6:4 C6:2 E6:2 G6:4 | Bb6:4 G6:4 A6:4 E6:4 | D6:4 E6:2 D6:2 C#6:4 A5:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.82, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.36, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.86, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'flute', oct: -12, vel: 0.34, only: ['B'], when: 'odd' },
      { type: 'comp', inst: 'guitar', pat: 'x.x.x.x.x.x.x.x.', vel: 0.3, range: [50, 67], max: 3, strum: 0.008 },
      { type: 'pad', inst: 'pad', vel: 0.28, range: [50, 69], max: 4, only: ['B'] },
      { type: 'bass', inst: 'bass', pat: ['R.R.R.R.R.R.5.R.', 'R.R.R.R.R.R.5.a.'], vel: 0.62, range: [36, 50] },
      { type: 'perc', inst: 'kick', pat: 'x...x...x...x...', vel: 0.48 },
      { type: 'perc', inst: 'clap', pat: '....x.......x...', vel: 0.36 },
      { type: 'perc', inst: 'tamb', pat: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.xxxx'], vel: 0.24 },
    ],
  },

  // Races on the roads: a bright F major gallop at 152 — marimba up front,
  // offbeat plucks, a skipping bass and a shaker like hooves; the flute
  // takes the B section, and the whole thing never quite sits still.
  race: {
    bpm: 152, beats: 4, swing: 0.5, key: 'F', mode: 'major', gain: 0.86, verb: 1.0,
    form: ['A', 'B'],
    sections: {
      A: {
        chords: 'F | C/E | Dm | Bb | F | C | Bb:2 C:2 | F',
        lead: 'C6:2 A5:2 C6:2 F6:2 A6:4 G6:2 F6:2 | E6:2 C6:2 E6:2 G6:2 C7:4 Bb6:2 G6:2 | A6:2 F6:2 D6:2 F6:2 A6:4 F6:4 | Bb6:4 A6:2 G6:2 F6:4 D6:4 | C6:2 A5:2 C6:2 F6:2 A6:4 G6:2 F6:2 | G6:2 E6:2 C6:2 E6:2 G6:4 C7:4 | Bb6:2 A6:2 G6:2 F6:2 G6:2 A6:2 Bb6:2 C7:2 | A6:8 F6:4 _:4',
      },
      B: {
        chords: 'Bb | C | Am | Dm | Bb | C | G7 | C7',
        lead: 'D6:4 F6:4 Bb6:6 A6:2 | G6:4 E6:4 C6:6 E6:2 | A6:4 E6:4 C6:4 E6:4 | F6:6 E6:2 D6:8 | D6:2 F6:2 Bb6:4 D6:2 F6:2 Bb6:4 | E6:2 G6:2 C7:4 E6:2 G6:2 C7:4 | B6:4 G6:4 D6:4 G6:4 | Bb6:4 G6:4 E6:4 C6:4',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.86, orn: 0.03, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.3, only: ['A'], when: 'odd' },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.8, orn: 0.05, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.36, only: ['B'] },
      { type: 'comp', inst: 'pluck', pat: '..x...x...x...x.', vel: 0.34, range: [53, 70], max: 3, strum: 0.004 },
      { type: 'bass', inst: 'bass', pat: ['R..5R..5R..5R.5.', 'R..5R..5R..5a.5.'], vel: 0.6, range: [36, 50] },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.44 },
      { type: 'perc', inst: 'clap', pat: '....x.......x...', vel: 0.3 },
      { type: 'perc', inst: 'shaker', pat: 'x.xxx.xxx.xxx.xx', vel: 0.3 },
    ],
  },

  // Dino Isle: a jungle romp. A dorian marimba riff bouncing over tuned
  // woodblocks, a syncopated bass and a shaker that never stops (A); the
  // flute takes over like a bird calling across the canopy while a kalimba
  // ripples underneath (B); then a drum break where the kalimba plays alone
  // with the woodblocks and claps (C).
  jungle: {
    bpm: 118, beats: 4, swing: 0.5, key: 'A', mode: 'dorian', gain: 0.98, verb: 1.3,
    form: ['A', 'B', 'A', 'C'],
    sections: {
      A: {
        chords: 'Am7 | D9 | Am7 | D9 | C | G | Am7 | E7sus4:2 E7:2',
        lead: 'A5:2 C6:2 D6:2 E6:4 D6:2 C6:2 A5:2 | D6:2 F#6:2 E6:2 D6:4 B5:2 A5:2 F#5:2 | A5:2 C6:2 D6:2 E6:3 G6:1 E6:2 D6:2 C6:2 | D6:4 B5:2 A5:2 F#5:4 _:4 | E6:2 G6:2 E6:2 C6:4 D6:2 E6:2 G6:2 | D6:2 B5:2 G5:2 B5:4 D6:2 G6:4 | E6:3 D6:3 C6:2 A5:3 C6:3 D6:2 | E6:4 B5:2 G#5:2 E5:8',
      },
      B: {
        chords: 'Fmaj7 | G | Em7 | Am7 | Dm7 | G | Cmaj7 | E7sus4:2 E7:2',
        lead: 'C6:6 A5:2 F5:8 | D6:6 B5:2 G5:8 | E6:4 D6:2 B5:2 G5:8 | A5:12 _:4 | F6:6 E6:2 D6:8 | D6:4 B5:2 D6:2 G6:8 | E6:6 D6:2 C6:4 B5:4 | B5:4 G#5:4 E5:8',
      },
      C: {
        chords: 'Am7 | Am7 | D9 | E7sus4:2 E7:2',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.74, orn: 0.05, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: 12, vel: 0.24, density: 0.5, only: ['A'], when: 'odd' },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.64, orn: 0.08, only: ['B'] },
      { type: 'arp', inst: 'kalimba', rate: 2, pat: [0, 2, 1, 3, 2, 4, 3, 1], vel: 0.24, range: [57], density: 0.85, only: ['B', 'C'] },
      { type: 'comp', inst: 'pluck', pat: '..x...x...x..x..', vel: 0.3, range: [55, 69], max: 3, strum: 0.006, only: ['A'] },
      { type: 'pad', inst: 'pad', vel: 0.36, range: [52, 67], max: 3, only: ['B'] },
      { type: 'bass', inst: 'bass', pat: ['R..R..5.R..R.8.5', 'R..R..5.R..R.a.5'], vel: 0.62, range: [33, 48], only: ['A', 'C'] },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.5, range: [33, 48], only: ['B'] },
      { type: 'perc', inst: 'kick', pat: 'x.....x...x.....', vel: 0.4 },
      { type: 'perc', inst: 'wood', pat: '..x..x....x..x.x', vel: 0.32 },
      { type: 'perc', inst: 'shaker', pat: 'xxxxxxxxxxxxxxxx', vel: 0.15 },
      { type: 'perc', inst: 'tamb', pat: '....x.......x...', vel: 0.22, only: ['A', 'C'] },
      { type: 'perc', inst: 'clap', pat: '....x.......x..x', vel: 0.22, only: ['C'] },
    ],
  },
  // ---------------------------------------------------------------- World v7: the Wide Sea & the Dawnlands
  // The Wide Sea: a broad sailing waltz in G — flute over rolling guitar, the swell in the bass.
  voyage: {
    bpm: 104, beats: 3, swing: 0.5, key: 'G', mode: 'major', gain: 0.92, verb: 1.6,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: { chords: 'G | D/F# | Em | C | G | D | C | D7', lead: 'D5:6 G5:3 B5:3 | A5:6 F#5:3 D5:3 | E5:6 G5:3 B5:3 | C6:9 B5:3 | B5:6 D6:3 B5:3 | A5:6 F#5:3 A5:3 | G5:3 E5:3 C5:3 E5:3 | D5:9 _:3' },
      B: { chords: 'Em | C | G | D | Em | C | Am7 | D7', lead: 'G5:6 B5:3 E6:3 | E6:6 D6:3 C6:3 | B5:9 G5:3 | A5:9 _:3 | G5:6 B5:3 E6:3 | G6:6 E6:3 C6:3 | A5:4 C6:4 E6:4 | D6:9 _:3' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.72, orn: 0.06 },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.14, density: 0.4, when: 'odd' },
      { type: 'arp', inst: 'guitar', rate: 2, pat: [0, 2, 3, 4, 3, 2], vel: 0.42, range: [50, 66], bassLow: true, ring: 4 },
      { type: 'pad', inst: 'pad', vel: 0.3, range: [52, 69], max: 3, only: ['B'] },
      { type: 'bass', inst: 'bass', pat: 'R-----5-----', vel: 0.55, range: [36, 50] },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x.', vel: 0.16 },
    ],
  },
  // Whale Isle: slow and dreamy in E♭ — a music box and bells over a deep, breathing pad.
  whale: {
    bpm: 66, beats: 4, swing: 0.5, key: 'Eb', mode: 'major', gain: 0.9, verb: 2.4,
    form: ['A', 'B'],
    sections: {
      A: { chords: 'Eb | Bb/D | Cm7 | Abmaj7 | Eb | Gm7 | Abmaj7 | Bb7sus4:2 Bb7:2', lead: 'G5:8 Bb5:4 Eb6:4 | D6:12 Bb5:4 | C6:8 Eb6:4 G6:4 | F6:12 _:4 | G6:6 F6:2 Eb6:8 | D6:6 Bb5:2 G5:8 | C6:4 Eb6:4 Ab6:8 | F6:16' },
      B: { chords: 'Cm | Ab | Eb | Bb | Cm | Ab | Fm7 | Bb7', lead: 'Eb6:8 G6:8 | F6:6 Eb6:2 C6:8 | Bb5:8 Eb6:4 G6:4 | F6:12 _:4 | G6:8 Bb6:8 | Ab6:6 G6:2 Eb6:8 | F6:4 Eb6:4 C6:4 Ab5:4 | Bb5:12 _:4' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', vel: 0.62, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.5, orn: 0.04, only: ['B'] },
      { type: 'arp', inst: 'kalimba', rate: 4, pat: [0, 2, 4, 2], vel: 0.18, range: [58], density: 0.7 },
      { type: 'pad', inst: 'pad', vel: 0.5, range: [48, 67], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.44, range: [34, 46] },
    ],
  },
  // Lantern Bay: a busy harbour in D — marimba & flute, offbeat plucks, a bouncing bass.
  harbor: {
    bpm: 116, beats: 4, swing: 0.5, key: 'D', mode: 'major', gain: 0.9, verb: 1.2,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: { chords: 'D | G | D | A7 | D | G | Em7:2 A7:2 | D', lead: 'F#5:2 A5:2 D6:4 C#6:2 D6:2 A5:4 | B5:2 D6:2 G6:4 F#6:2 E6:2 D6:4 | F#5:2 A5:2 D6:2 F#6:2 E6:4 D6:4 | C#6:4 E6:4 A5:8 | F#5:2 A5:2 D6:4 C#6:2 D6:2 F#6:4 | G6:4 F#6:2 E6:2 D6:4 B5:4 | E6:4 D6:2 C#6:2 A5:4 C#6:4 | D6:12 _:4' },
      B: { chords: 'Bm | G | D | A | Bm | G | Em7 | A7', lead: 'D6:4 B5:4 F#5:8 | G5:4 B5:4 D6:8 | F#6:6 E6:2 D6:8 | C#6:4 E6:4 A6:8 | F#6:4 D6:4 B5:8 | B5:4 D6:4 G6:8 | G6:4 F#6:4 E6:4 D6:4 | C#6:8 A5:8' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.8, orn: 0.05, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.7, orn: 0.06, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.16, density: 0.35, when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: '..x...x...x...x.', vel: 0.32, range: [55, 71], max: 3, strum: 0.006 },
      { type: 'bass', inst: 'bass', pat: 'R...5...R...5.a.', vel: 0.6, range: [38, 52] },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.36 },
      { type: 'perc', inst: 'tamb', pat: '....x.......x...', vel: 0.24 },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x...x.', vel: 0.14 },
    ],
  },
  // Jade Terraces: a pentatonic air in G — a bamboo flute over a kalimba zither, wood blocks.
  jade: {
    bpm: 84, beats: 4, swing: 0.5, key: 'G', mode: 'major', gain: 0.92, verb: 1.9,
    form: ['A', 'B', 'A', 'B'],
    sections: {
      A: { chords: 'G | Em7 | C | D | G | Em7 | Am7 | D', lead: 'D5:4 E5:2 G5:2 A5:8 | B5:6 A5:2 G5:4 E5:4 | G5:4 A5:4 B5:2 D6:2 E6:4 | D6:12 _:4 | E6:4 D6:2 B5:2 A5:4 G5:4 | E5:6 G5:2 A5:8 | B5:4 A5:4 E5:4 G5:4 | A5:12 _:4' },
      B: { chords: 'Em | C | G | D | Em | C | Am7 | D7sus4:2 D:2', lead: 'E6:6 D6:2 B5:8 | G5:4 A5:4 B5:4 E6:4 | D6:8 B5:4 A5:4 | G5:12 _:4 | E5:4 G5:4 A5:4 B5:4 | D6:6 E6:2 G6:8 | E6:4 D6:4 B5:4 A5:4 | G5:16' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.72, orn: 0.1 },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.22, only: ['B'], when: 'odd' },
      { type: 'arp', inst: 'kalimba', rate: 2, pat: [0, 1, 2, 4, 3, 2, 1, 2], vel: 0.26, range: [55], density: 0.9 },
      { type: 'pad', inst: 'pad', vel: 0.32, range: [50, 67], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-------5---R---', vel: 0.46, range: [36, 48] },
      { type: 'perc', inst: 'wood', pat: 'x.....x...x.....', vel: 0.26 },
      { type: 'perc', inst: 'wood', pat: '..............xx', vel: 0.14, when: 'odd' },
    ],
  },
  // Saltmirror Flats: wide open sky in A lydian — bells and an electric piano over long pads.
  salt: {
    bpm: 70, beats: 4, swing: 0.5, key: 'A', mode: 'lydian', gain: 0.88, verb: 2.6,
    form: ['A', 'B'],
    sections: {
      A: { chords: 'Amaj7 | B/A | Amaj7 | B/A | F#m7 | Emaj7 | Dmaj7 | E', lead: 'E5:8 C#6:8 | D#6:12 B5:4 | C#6:8 E6:8 | F#6:12 _:4 | E6:6 C#6:2 A5:8 | B5:6 G#5:2 E5:8 | F#5:4 A5:4 D6:8 | E6:16' },
      B: { chords: 'C#m7 | Amaj7 | B | G#m7 | C#m7 | Amaj7 | Dmaj7 | E', lead: 'G#6:8 E6:8 | C#6:12 E6:4 | D#6:8 F#6:8 | G#6:12 _:4 | E6:6 G#6:2 B6:8 | A6:8 E6:8 | F#6:6 A6:2 D6:8 | E6:12 _:4' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.55, orn: 0.03, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'epiano', vel: 0.55, orn: 0.03, only: ['B'] },
      { type: 'arp', inst: 'musicbox', rate: 2, pat: [0, 2, 4, 3, 1, 3, 2, 4], vel: 0.16, range: [68], density: 0.55 },
      { type: 'pad', inst: 'pad', vel: 0.52, range: [48, 69], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R---------------', vel: 0.38, range: [33, 45] },
    ],
  },
  // Emberleaf Wood: an autumn waltz in F — flute and marimba over a fingerpicked guitar.
  autumn: {
    bpm: 96, beats: 3, swing: 0.5, key: 'F', mode: 'major', gain: 0.92, verb: 1.5,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: { chords: 'F | C/E | Dm | Bb | F | Gm7 | C7 | F', lead: 'C5:3 F5:3 A5:3 C6:3 | C6:6 G5:3 E5:3 | D5:3 F5:3 A5:3 D6:3 | D6:6 Bb5:6 | A5:3 C6:3 F6:3 E6:3 | D6:6 Bb5:3 G5:3 | E5:3 G5:3 Bb5:3 C6:3 | A5:9 _:3' },
      B: { chords: 'Dm | Am | Bb | F | Dm | Am | Gm7 | C7', lead: 'F6:6 E6:3 D6:3 | C6:6 A5:3 E5:3 | F5:3 Bb5:3 D6:3 F6:3 | E6:6 C6:6 | D6:6 F6:3 A6:3 | G6:6 E6:3 C6:3 | Bb5:6 D6:3 G6:3 | E6:9 _:3' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.68, orn: 0.07, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.7, orn: 0.05, only: ['B'] },
      { type: 'arp', inst: 'guitar', rate: 2, pat: [0, 2, 4, 3, 2, 3], vel: 0.44, range: [48, 65], bassLow: true, ring: 4 },
      { type: 'pad', inst: 'pad', vel: 0.26, range: [53, 69], max: 3, when: 'odd' },
      { type: 'bass', inst: 'bass', pat: 'R-------5---', vel: 0.5, range: [36, 48] },
      { type: 'perc', inst: 'brush', pat: 'x...x...x...', vel: 0.14 },
    ],
  },
  // Glowtide Coast: a night tide in E dorian — a music box & bells, marimba ripples.
  glow: {
    bpm: 80, beats: 4, swing: 0.5, key: 'E', mode: 'dorian', gain: 0.9, verb: 2.2,
    form: ['A', 'B'],
    sections: {
      A: { chords: 'Em7 | A | Em7 | A | Cmaj7 | D | Em7 | B7sus4:2 B7:2', lead: 'B5:4 E6:4 D6:2 B5:2 A5:4 | C#6:8 A5:8 | G5:4 B5:4 E6:2 F#6:2 G6:4 | F#6:12 _:4 | E6:4 G6:4 B6:8 | A6:6 F#6:2 D6:8 | E6:4 D6:4 B5:4 G5:4 | F#5:12 _:4' },
      B: { chords: 'Am7 | D | G | Cmaj7 | Am7 | D | Em7 | B7', lead: 'C6:6 E6:2 A6:8 | F#6:6 D6:2 A5:8 | B5:4 D6:4 G6:8 | E6:12 _:4 | A5:4 C6:4 E6:4 G6:4 | F#6:6 E6:2 D6:8 | E6:6 B5:2 G5:8 | D#6:8 B5:8' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', vel: 0.66, orn: 0.05, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.52, orn: 0.04, only: ['B'] },
      { type: 'arp', inst: 'marimba', rate: 2, pat: [0, 2, 1, 3, 2, 4, 3, 2], vel: 0.22, range: [52], density: 0.8 },
      { type: 'pad', inst: 'pad', vel: 0.4, range: [50, 67], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-----5-R-------', vel: 0.48, range: [33, 47] },
      { type: 'perc', inst: 'shaker', pat: '..x...x...x...x.', vel: 0.12 },
    ],
  },
  // Elderbough: under the giants, in C with a lydian lift — flute and electric piano, a harp of plucks.
  elder: {
    bpm: 72, beats: 4, swing: 0.5, key: 'C', mode: 'lydian', gain: 0.9, verb: 2.4,
    form: ['A', 'B', 'A', 'B'],
    sections: {
      A: { chords: 'C | D/C | Em7 | Am7 | Fmaj7 | G | Am7 | G', lead: 'E5:8 G5:4 C6:4 | F#5:8 A5:4 D6:4 | G5:6 B5:2 E6:8 | C6:12 _:4 | A5:6 C6:2 F6:8 | D6:6 B5:2 G5:8 | A5:4 C6:4 E6:4 G6:4 | D6:16' },
      B: { chords: 'Am | Fmaj7 | C | G | Am | Fmaj7 | Dm7 | G7sus4:2 G7:2', lead: 'E6:8 C6:4 A5:4 | A5:6 C6:2 F6:8 | G6:8 E6:8 | D6:12 _:4 | C6:4 E6:4 A6:8 | G6:6 F6:2 C6:8 | D6:4 F6:4 A6:4 F6:4 | G6:12 _:4' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.68, orn: 0.06, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'epiano', vel: 0.6, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.14, density: 0.4, when: 'odd' },
      { type: 'arp', inst: 'pluck', rate: 2, pat: [0, 1, 2, 3, 4, 3, 2, 1], vel: 0.26, range: [48, 67], ring: 4, density: 0.9 },
      { type: 'pad', inst: 'pad', vel: 0.48, range: [48, 67], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R-------5-------', vel: 0.46, range: [33, 45] },
    ],
  },
  // Hollowmoor: a Highland lament in D dorian — a pipe-like flute over a drone.
  moor: {
    bpm: 90, beats: 3, swing: 0.5, key: 'D', mode: 'dorian', gain: 0.9, verb: 2.2,
    form: ['A', 'B', 'A'],
    sections: {
      A: { chords: 'Dm | C | Dm | Am | Dm | C | G | Am', lead: 'D5:3 F5:3 A5:3 D6:3 | C6:6 G5:3 E5:3 | F5:3 A5:3 D6:3 E6:3 | C6:9 A5:3 | D6:6 F6:3 E6:3 | C6:6 A5:3 G5:3 | B5:3 D6:3 G6:3 D6:3 | A5:9 _:3' },
      B: { chords: 'F | C | Dm | Am | F | C | G | A', lead: 'A5:6 C6:3 F6:3 | E6:6 C6:3 G5:3 | F5:3 A5:3 D6:6 | E6:9 _:3 | F6:6 E6:3 D6:3 | C6:6 E6:3 G6:3 | D6:6 B5:3 G5:3 | C#6:9 _:3' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.74, orn: 0.14 },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.2, when: 'odd', only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.44, range: [45, 62], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-----------', vel: 0.5, range: [38, 50] },
      { type: 'perc', inst: 'wood', pat: 'x.....x.....', vel: 0.22 },
      { type: 'perc', inst: 'brush', pat: '....x...x...', vel: 0.12 },
    ],
  },
  // Prism Springs: bubbling, popping, playful in B♭ — kalimba & marimba over a hopping bass.
  prism: {
    bpm: 118, beats: 4, swing: 0.5, key: 'Bb', mode: 'major', gain: 0.88, verb: 1.3,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: { chords: 'Bb | Gm7 | Eb | F | Bb | Gm7 | Cm7:2 F7:2 | Bb', lead: 'D6:2 F6:2 Bb5:2 D6:2 F6:4 D6:4 | G6:2 F6:2 D6:2 Bb5:2 G5:4 Bb5:4 | Eb6:2 G6:2 Bb6:4 G6:2 Eb6:2 Bb5:4 | C6:4 F6:4 A5:8 | D6:2 F6:2 Bb5:2 D6:2 F6:4 Bb6:4 | A6:2 G6:2 F6:2 D6:2 Bb5:8 | C6:2 Eb6:2 G6:4 F6:2 Eb6:2 A5:4 | Bb5:12 _:4' },
      B: { chords: 'Eb | F | Dm7 | Gm7 | Eb | F | Cm7 | F7', lead: 'G5:4 Bb5:4 Eb6:8 | F6:4 C6:4 A5:8 | D6:4 F6:4 A6:8 | G6:12 _:4 | Bb6:4 G6:4 Eb6:8 | A6:4 F6:4 C6:8 | Eb6:4 G6:4 C6:4 Eb6:4 | F6:12 _:4' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.82, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.8, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.14, density: 0.3, when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: 'x..x..x...x..x..', vel: 0.28, range: [55, 70], max: 3, strum: 0.005 },
      { type: 'bass', inst: 'bass', pat: 'R..R..5.R..R..5.', vel: 0.58, range: [34, 48] },
      { type: 'perc', inst: 'kick', pat: 'x.......x.......', vel: 0.34 },
      { type: 'perc', inst: 'shaker', pat: 'x.x.x.x.x.x.x.x.', vel: 0.14 },
      { type: 'perc', inst: 'clap', pat: '....x.......x...', vel: 0.2, only: ['B'] },
    ],
  },
  // Cogsworth Heights: an Alpine ländler in C — a music box that yodels, clockwork ticks, oom-pah-pah.
  clock: {
    bpm: 138, beats: 3, swing: 0.5, key: 'C', mode: 'major', gain: 0.9, verb: 1.3,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: { chords: 'C | G7 | G7 | C | C | F | G7 | C', lead: 'E5:3 G5:3 C6:3 E6:3 | D6:6 B5:3 G5:3 | F5:3 G5:3 B5:3 D6:3 | C6:9 _:3 | G5:3 C6:3 E6:3 G6:3 | A6:6 F6:3 C6:3 | B5:3 D6:3 F6:3 D6:3 | C6:9 _:3' },
      B: { chords: 'F | C | G7 | C | F | C | G7 | C', lead: 'A5:3 C6:3 F6:6 | E6:3 G6:3 C7:6 | B6:3 G6:3 D6:3 B5:3 | C6:6 G5:6 | F6:3 A6:3 C7:6 | G6:3 E6:3 C6:6 | D6:3 F6:3 B6:3 G6:3 | C7:9 _:3' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'musicbox', vel: 0.76, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.72, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: 12, vel: 0.16, density: 0.4, only: ['B'], when: 'odd' },
      { type: 'comp', inst: 'pluck', pat: '....x...x...', vel: 0.32, range: [55, 70], max: 3, strum: 0.004 },
      { type: 'bass', inst: 'bass', pat: 'R-------5---', vel: 0.6, range: [36, 48] },
      { type: 'perc', inst: 'wood', pat: 'x...x...x...', vel: 0.24 },
      { type: 'perc', inst: 'tamb', pat: '........x...', vel: 0.14, when: 'odd' },
    ],
  },
  // Aurora Tundra: cold light in F♯ minor — bells and a shimmering music box, a breath of flute.
  tundra: {
    bpm: 66, beats: 4, swing: 0.5, key: 'F#', mode: 'minor', gain: 0.88, verb: 2.8,
    form: ['A', 'B'],
    sections: {
      A: { chords: 'F#m | D | A | E | F#m | D | Bm7 | C#7sus4:2 C#7:2', lead: 'C#6:8 A5:4 F#5:4 | A5:8 D6:8 | E6:12 C#6:4 | B5:16 | C#6:6 E6:2 F#6:8 | F#6:6 E6:2 D6:8 | D6:4 C#6:4 B5:4 F#5:4 | G#5:12 _:4' },
      B: { chords: 'D | E | C#m7 | F#m | D | E | Bm7 | C#7', lead: 'F#6:8 A6:8 | G#6:12 E6:4 | E6:8 C#6:8 | F#6:12 _:4 | A6:6 F#6:2 D6:8 | B6:6 G#6:2 E6:8 | D6:4 F#6:4 B6:8 | G#6:8 _:8' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.56, orn: 0.03, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.6, orn: 0.05, only: ['B'] },
      { type: 'arp', inst: 'musicbox', rate: 2, pat: [0, 2, 4, 2, 3, 1, 4, 2], vel: 0.2, range: [66], density: 0.75 },
      { type: 'pad', inst: 'pad', vel: 0.55, range: [45, 66], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R---------------', vel: 0.4, range: [30, 42] },
    ],
  },
  // The Umbral Scar: the last land, in C minor with a phrygian shadow — a slow heartbeat under it all.
  scar: {
    bpm: 88, beats: 4, swing: 0.5, key: 'C', mode: 'minor', gain: 0.88, verb: 2.2,
    form: ['A', 'B'],
    sections: {
      A: { chords: 'Cm | Db | Cm | Bbm7:2 Ab:2 | Fm | Db | G7sus4:2 G7:2 | Cm', lead: 'G5:6 Ab5:2 G5:8 | F5:6 Ab5:2 Db6:8 | C6:4 Bb5:2 G5:2 Eb5:8 | F5:6 Eb5:2 C5:8 | C6:6 Ab5:2 F5:8 | Db6:6 F6:2 Ab6:8 | G6:8 F6:4 D6:4 | C6:12 _:4' },
      B: { chords: 'Ab | Eb | Fm | Cm | Ab | Eb | Db | G7', lead: 'C6:4 Eb6:4 Ab6:8 | G6:8 Eb6:8 | Ab6:6 G6:2 F6:8 | Eb6:12 _:4 | Eb6:4 F6:4 Ab6:8 | G6:6 Bb6:2 Eb6:8 | F6:4 Ab6:4 Db6:8 | B5:8 D6:4 G5:4' },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'epiano', vel: 0.62, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.66, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: -12, vel: 0.18, when: 'odd' },
      { type: 'pad', inst: 'pad', vel: 0.5, range: [43, 62], max: 4 },
      { type: 'bass', inst: 'bass', pat: 'R--R------------', vel: 0.62, range: [28, 40] },
      { type: 'perc', inst: 'kick', pat: 'x..x............', vel: 0.38 },
      { type: 'perc', inst: 'brush', pat: '........x.......', vel: 0.14 },
    ],
  },

  // (World v7, ch10) the Gloomstage: tiptoeing backstage — a staccato pizzicato tune full of
  // rests, a chromatic creep, wood blocks like footsteps; B section: a flute, closer now
  gloomstage: {
    bpm: 108, beats: 4, swing: 0.58, key: 'G', mode: 'minor', gain: 0.9, verb: 1.8,
    form: ['A', 'A', 'B', 'A'],
    sections: {
      A: {
        chords: 'Gm | Gm | Cm | D7 | Gm | Eb | Cm | D7',
        lead: 'D5:2 _:2 D5:2 _:2 Eb5:2 D5:2 _:4 | Bb4:2 _:2 A4:2 _:2 G4:4 _:4 | C5:2 _:2 C5:2 _:2 D5:2 C5:2 _:4 | A4:2 _:2 F#4:2 _:2 D4:4 _:4 | G5:2 _:2 F#5:2 _:2 F5:2 _:2 E5:2 _:2 | Eb5:4 _:2 D5:2 C5:4 Bb4:4 | A4:2 _:2 C5:2 _:2 Eb5:4 D5:4 | F#5:2 _:2 D5:2 _:2 A4:8',
      },
      B: {
        chords: 'Eb | D7 | Gm | Gm | Eb | D7 | Cm | D7',
        lead: 'G5:6 F5:2 Eb5:4 D5:4 | F#5:6 A5:2 D5:8 | Bb5:4 A5:4 G5:4 D5:4 | G5:12 _:4 | Eb6:4 D6:4 C6:4 Bb5:4 | A5:4 C6:4 F#5:8 | G5:4 Eb5:4 C5:4 Eb5:4 | D5:2 _:2 D5:2 _:2 D5:8',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'pluck', vel: 0.62, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', oct: -12, vel: 0.3, only: ['A'], when: 'odd' },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.5, orn: 0.04, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'pluck', oct: -12, vel: 0.26, only: ['B'] },
      { type: 'pad', inst: 'pad', vel: 0.3, range: [50, 64], max: 3, only: ['B'] },
      { type: 'bass', inst: 'bass', pat: 'R...R...5...R...', vel: 0.46, range: [31, 43] },
      { type: 'perc', inst: 'wood', pat: 'x...x...x...x...', vel: 0.22 },
      { type: 'perc', inst: 'brush', pat: '..x...x...x...x.', vel: 0.14 },
    ],
  },

  // (World v7, ch10) the Grand Finale: her villain’s waltz, all grown up — A quotes her own
  // theme on marimba and bells; B turns to the major, the heroes pushing back (flute); C is
  // Act III, the Umbral Spotlight: driving eighths on kalimba over a pounding bass
  finale: {
    bpm: 160, beats: 3, swing: 0.5, key: 'D', mode: 'minor', gain: 0.9, verb: 1.4,
    form: ['A', 'B', 'A', 'C'],
    sections: {
      A: {
        chords: 'Dm | A7 | Dm | A7 | Gm | Dm | E7 | A7',
        lead: 'D5:6 F5:3 A5:3 | C#6:6 A5:3 E5:3 | F5:4 E5:4 D5:4 | A4:9 _:3 | Bb5:6 A5:3 G5:3 | F5:6 E5:3 D5:3 | E5:3 F5:3 G#5:3 B5:3 | A5:6 _:3 A4:3',
      },
      B: {
        chords: 'Bb | C | F | Dm | Gm | A7 | D | A7',
        lead: 'D6:6 C6:3 Bb5:3 | E6:6 D6:3 C6:3 | F6:9 C6:3 | D6:12 | G5:3 Bb5:3 D6:3 G6:3 | E6:6 C#6:3 A5:3 | F#6:9 D6:3 | E6:6 C#6:6',
      },
      C: {
        chords: 'Dm | Bb | Gm | A7 | Dm | Bb | E7 | A7',
        lead: 'A5:3 A5:3 D6:3 A5:3 | Bb5:3 A5:3 G5:3 F5:3 | G5:3 Bb5:3 D6:3 G6:3 | C#6:12 | A5:3 D6:3 F6:3 A6:3 | G6:3 F6:3 E6:3 D6:3 | E6:3 G#5:3 B5:3 D6:3 | C#6:6 E6:6',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'marimba', vel: 0.84, orn: 0.04, only: ['A'] },
      { type: 'notes', src: 'lead', inst: 'bell', vel: 0.2, only: ['A'], when: 'odd' },
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.8, orn: 0.05, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'marimba', oct: -12, vel: 0.36, only: ['B'] },
      { type: 'notes', src: 'lead', inst: 'kalimba', vel: 0.84, orn: 0.03, only: ['C'] },
      { type: 'notes', src: 'lead', inst: 'bell', oct: -12, vel: 0.2, only: ['C'] },
      { type: 'comp', inst: 'pluck', pat: '....x...x...', vel: 0.32, range: [55, 70], max: 3, strum: 0.006 },
      { type: 'pad', inst: 'pad', vel: 0.3, range: [50, 67], max: 4, only: ['B', 'C'] },
      { type: 'bass', inst: 'bass', pat: ['R-------5---', 'R-------3---'], vel: 0.68, range: [33, 45] },
      { type: 'perc', inst: 'kick', pat: 'x...........', vel: 0.46 },
      { type: 'perc', inst: 'kick', pat: '......x.....', vel: 0.3, only: ['C'] },
      { type: 'perc', inst: 'clap', pat: '....x.......', vel: 0.3, only: ['C'] },
      { type: 'perc', inst: 'tamb', pat: '....x...x...', vel: 0.2, only: ['B', 'C'] },
    ],
  },

  // (World v7, ch10) the Epilogue: the Duchess’s aria, sung at last — all of it. A slow
  // waltz in F, a flute for her voice, a music box turning under it, bells far off
  aria: {
    bpm: 84, beats: 3, swing: 0.5, key: 'F', mode: 'major', gain: 0.9, verb: 2.6,
    form: ['A', 'B', 'A', 'B'],
    sections: {
      A: {
        chords: 'F | Dm | Bb | C | F | Am | Bb | C7',
        lead: 'C5:6 F5:3 A5:3 | A5:8 G5:4 | F5:6 D5:3 Bb4:3 | C5:12 | C5:6 F5:3 A5:3 | C6:8 A5:4 | Bb5:4 A5:4 G5:4 | G5:12',
      },
      B: {
        chords: 'Bb | F | Gm | C | Bb | F | C7 | F',
        lead: 'D6:6 C6:3 Bb5:3 | A5:9 F5:3 | Bb5:4 A5:4 G5:4 | E5:9 C5:3 | D6:6 C6:3 Bb5:3 | A5:6 C6:6 | Bb5:4 G5:4 E5:4 | F5:12',
      },
    },
    parts: [
      { type: 'notes', src: 'lead', inst: 'flute', vel: 0.72, orn: 0.05 },
      { type: 'notes', src: 'lead', inst: 'bell', oct: -12, vel: 0.14, when: 'odd' },
      { type: 'arp', inst: 'musicbox', rate: 1, pat: [0, 2, 4, 2, 4, 2], vel: 0.2, range: [60], density: 0.9 },
      { type: 'pad', inst: 'pad', vel: 0.46, range: [48, 65], max: 3 },
      { type: 'bass', inst: 'bass', pat: 'R-----5-----', vel: 0.4, range: [29, 41] },
    ],
  },
};

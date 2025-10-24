// Utility functions and constants for matrix component
// Moved from matrix.tsx to fix fast refresh warnings

export type Frame = number[][]

export const digits: Frame[] = [
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
]

export const chevronLeft: Frame = [
  [0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
]

export const chevronRight: Frame = [
  [0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
]

export const loader: Frame[] = (() => {
  const frames: Frame[] = []
  for (let i = 0; i < 8; i++) {
    const frame: Frame = []
    for (let row = 0; row < 8; row++) {
      const frameRow: number[] = []
      for (let col = 0; col < 8; col++) {
        if ((row + col + i) % 8 < 4) {
          frameRow.push(1)
        } else {
          frameRow.push(0)
        }
      }
      frame.push(frameRow)
    }
    frames.push(frame)
  }
  return frames
})()

export const pulse: Frame[] = (() => {
  const frames: Frame[] = []
  for (let i = 0; i < 8; i++) {
    const frame: Frame = []
    for (let row = 0; row < 8; row++) {
      const frameRow: number[] = []
      const intensity = Math.sin((i / 8) * Math.PI * 2)
      const threshold = (intensity + 1) / 2
      for (let col = 0; col < 8; col++) {
        if (Math.random() < threshold) {
          frameRow.push(1)
        } else {
          frameRow.push(0)
        }
      }
      frame.push(frameRow)
    }
    frames.push(frame)
  }
  return frames
})()

export function vu(columns: number, levels: number[]): Frame {
  const frame: Frame = []
  for (let row = 0; row < 8; row++) {
    const frameRow: number[] = []
    for (let col = 0; col < columns; col++) {
      const level = levels[col] || 0
      const height = Math.floor(level * 8)
      if (row >= 8 - height) {
        frameRow.push(1)
      } else {
        frameRow.push(0)
      }
    }
    frame.push(frameRow)
  }
  return frame
}

export const wave: Frame[] = (() => {
  const frames: Frame[] = []
  for (let i = 0; i < 16; i++) {
    const frame: Frame = []
    for (let row = 0; row < 8; row++) {
      const frameRow: number[] = []
      for (let col = 0; col < 8; col++) {
        const wave = Math.sin((col + i) * Math.PI / 4)
        const height = Math.floor((wave + 1) * 4)
        if (row >= 8 - height) {
          frameRow.push(1)
        } else {
          frameRow.push(0)
        }
      }
      frame.push(frameRow)
    }
    frames.push(frame)
  }
  return frames
})()

export const snake: Frame[] = (() => {
  const frames: Frame[] = []
  for (let i = 0; i < 16; i++) {
    const frame: Frame = []
    for (let row = 0; row < 8; row++) {
      const frameRow: number[] = []
      for (let col = 0; col < 8; col++) {
        const snake = Math.sin((col + i) * Math.PI / 2)
        const height = Math.floor((snake + 1) * 4)
        if (row >= 8 - height) {
          frameRow.push(1)
        } else {
          frameRow.push(0)
        }
      }
      frame.push(frameRow)
    }
    frames.push(frame)
  }
  return frames
})()

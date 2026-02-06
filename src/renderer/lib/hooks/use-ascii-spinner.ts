import { useEffect, useState, useMemo } from "react"

// All braille spinner patterns from cli-spinners
const SPINNERS = {
  dots: { interval: 80, frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] },
  dots2: { interval: 80, frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"] },
  dots3: { interval: 80, frames: ["⠋", "⠙", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓"] },
  dots4: { interval: 80, frames: ["⠄", "⠆", "⠇", "⠋", "⠙", "⠸", "⠰", "⠠", "⠰", "⠸", "⠙", "⠋", "⠇", "⠆"] },
  dots5: { interval: 80, frames: ["⠋", "⠙", "⠚", "⠒", "⠂", "⠂", "⠒", "⠲", "⠴", "⠦", "⠖", "⠒", "⠐", "⠐", "⠒", "⠓", "⠋"] },
  dots6: { interval: 80, frames: ["⠁", "⠉", "⠙", "⠚", "⠒", "⠂", "⠂", "⠒", "⠲", "⠴", "⠤", "⠄", "⠄", "⠤", "⠴", "⠲", "⠒", "⠂", "⠂", "⠒", "⠚", "⠙", "⠉", "⠁"] },
  dots7: { interval: 80, frames: ["⠈", "⠉", "⠋", "⠓", "⠒", "⠐", "⠐", "⠒", "⠖", "⠦", "⠤", "⠠", "⠠", "⠤", "⠦", "⠖", "⠒", "⠐", "⠐", "⠒", "⠓", "⠋", "⠉", "⠈"] },
  dots8: { interval: 80, frames: ["⠁", "⠁", "⠉", "⠙", "⠚", "⠒", "⠂", "⠂", "⠒", "⠲", "⠴", "⠤", "⠄", "⠄", "⠤", "⠠", "⠠", "⠤", "⠦", "⠖", "⠒", "⠐", "⠐", "⠒", "⠓", "⠋", "⠉", "⠈", "⠈"] },
  dots9: { interval: 80, frames: ["⢹", "⢺", "⢼", "⣸", "⣇", "⡧", "⡗", "⡏"] },
  dots10: { interval: 80, frames: ["⢄", "⢂", "⢁", "⡁", "⡈", "⡐", "⡠"] },
  dots11: { interval: 100, frames: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"] },
}

type SpinnerName = keyof typeof SPINNERS
const SPINNER_NAMES = Object.keys(SPINNERS) as SpinnerName[]

// Get a random spinner pattern
function getRandomSpinner() {
  const name = SPINNER_NAMES[Math.floor(Math.random() * SPINNER_NAMES.length)]
  return SPINNERS[name]
}

/**
 * Hook for ASCII spinner animation
 * Picks a random spinner pattern on mount and animates it
 */
export function useAsciiSpinner(isActive: boolean) {
  const [frameIndex, setFrameIndex] = useState(0)

  // Pick a random spinner on mount (stable for component lifetime)
  const spinner = useMemo(() => getRandomSpinner(), [])

  useEffect(() => {
    if (!isActive) {
      setFrameIndex(0)
      return
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % spinner.frames.length)
    }, spinner.interval)

    return () => clearInterval(interval)
  }, [isActive, spinner])

  return spinner.frames[frameIndex]
}

/**
 * Get a specific spinner by name
 */
export function useNamedSpinner(name: SpinnerName, isActive: boolean) {
  const [frameIndex, setFrameIndex] = useState(0)
  const spinner = SPINNERS[name]

  useEffect(() => {
    if (!isActive) {
      setFrameIndex(0)
      return
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % spinner.frames.length)
    }, spinner.interval)

    return () => clearInterval(interval)
  }, [isActive, spinner])

  return spinner.frames[frameIndex]
}

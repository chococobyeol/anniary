export const MIN_BOARD_YEAR = 1000
export const MAX_BOARD_YEAR = 9999

export function isValidBoardYear(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_BOARD_YEAR && value <= MAX_BOARD_YEAR
}

import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  CornerDownLeft,
  CornerDownRight,
  RotateCw,
  Flag,
  MapPin,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

// GraphHopper turn-instruction sign codes -> icon mapping. This is the
// single source of truth for the sign value list (see the `sign` field
// comment on Instruction in ../api/graphhopper.ts). Icon choices are a
// reasonable approximation of turn severity given lucide-react's available
// icon set: CornerUpLeft/CornerUpRight for a clear ~90 degree turn,
// ArrowUpLeft/ArrowUpRight for a slight turn or "keep left/right", and
// CornerDownLeft/CornerDownRight for a U-turn. Not pixel-perfect against
// real turn geometry -- cheap to swap individual entries later.
const SIGN_ICONS: Record<number, LucideIcon> = {
  [-98]: HelpCircle, // unknown / keep-in-lane (rare)
  [-8]: CornerDownLeft, // U-turn left (rare/deprecated)
  [-7]: ArrowUpLeft, // keep left
  [-3]: CornerUpLeft, // sharp left
  [-2]: CornerUpLeft, // left
  [-1]: ArrowUpLeft, // slight left
  0: ArrowUp, // continue straight
  1: ArrowUpRight, // slight right
  2: CornerUpRight, // right
  3: CornerUpRight, // sharp right
  4: Flag, // reached destination
  5: MapPin, // via point reached
  6: RotateCw, // roundabout (check exit_number for which exit)
  7: ArrowUpRight, // keep right
  8: CornerDownRight, // U-turn right
}

export function getDirectionIcon(sign: number): LucideIcon {
  return SIGN_ICONS[sign] ?? HelpCircle
}

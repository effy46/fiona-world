// Shared atlas timing; scene controllers retain their own movement and easing.
export const CAT_TURN_FRAME_SECONDS = .045;
export const CAT_SETTLE_SECONDS = .56;
export const catWalkFrame = (elapsed: number) => 4 + Math.floor(elapsed / .11) % 8;
export const catSettleFrame = (elapsed: number) => 12 + Math.min(3, Math.floor(elapsed / .14));
export const catTurnDuration = (fromFront: boolean, fromMirrored: boolean, mirrored: boolean) =>
  CAT_TURN_FRAME_SECONDS * (fromFront ? 4 : fromMirrored === mirrored ? 1 : 7);

export function catTurnPose(elapsed: number, fromFront: boolean, fromMirrored: boolean, mirrored: boolean) {
  const index = Math.floor(elapsed / CAT_TURN_FRAME_SECONDS);
  return {
    frame: fromFront ? Math.min(3, index) : fromMirrored === mirrored ? 3 : [3,2,1,0,1,2,3][Math.min(6, index)],
    mirrored: !fromFront && index < 4 ? fromMirrored : mirrored
  };
}

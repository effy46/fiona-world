// Shared atlas timing; scene controllers retain their own movement and easing.
export const CAT_TURN_FRAME_SECONDS = .045;
export const CAT_SETTLE_SECONDS = .56;
export const catWalkFrame = (elapsed: number) => 4 + Math.floor(elapsed / .11) % 8;
export const catSettleFrame = (elapsed: number) => elapsed < .28 ? 12 + Math.min(3, Math.floor(elapsed / .07)) : [3,2,1][Math.min(2, Math.floor((elapsed - .28) / (.28 / 3)))];
// Resting cats look back toward the reader; walking cats retain a side profile.
export const CAT_REST_FRAME = 1;
const catTurnFrames = (fromFrame: number, fromMirrored: boolean, mirrored: boolean) =>
  fromFrame === 0 ? [0,1,2,3] : fromFrame === CAT_REST_FRAME
    ? (fromMirrored === mirrored ? [1,2,3] : [1,0,1,2,3])
    : fromMirrored === mirrored ? [3] : [3,2,1,0,1,2,3];
export const catTurnDuration = (fromFrame: number, fromMirrored: boolean, mirrored: boolean) =>
  CAT_TURN_FRAME_SECONDS * catTurnFrames(fromFrame, fromMirrored, mirrored).length;

export function catTurnPose(elapsed: number, fromFrame: number, fromMirrored: boolean, mirrored: boolean) {
  const frames = catTurnFrames(fromFrame, fromMirrored, mirrored);
  const index = Math.min(frames.length - 1, Math.floor(elapsed / CAT_TURN_FRAME_SECONDS));
  const switchAt = fromFrame === CAT_REST_FRAME ? 2 : 4;
  return {
    frame: frames[index],
    mirrored: fromFrame !== 0 && index < switchAt ? fromMirrored : mirrored
  };
}

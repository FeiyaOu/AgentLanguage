import success from '../assets/lottie/success.json';
import writing from '../assets/lottie/writing.json';

/** Check pops in, then dots burst. Plays once. */
export const successAnimation = success;

/** A note card whose lines draw one by one, then fade so the loop can restart. */
export const writingAnimation = writing;
/** Frame where every line is drawn and none has started fading. */
export const WRITING_DRAWN_FRAME = 110;

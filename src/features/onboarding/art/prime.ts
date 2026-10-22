import { type SkSkottieAnimation, Skia } from "@shopify/react-native-skia";
import { PixelRatio } from "react-native";
import { runOnUI, scheduleOnRN } from "react-native-worklets";

import { ARTBOARD } from "../motion";

const STEADY_FRAME_GAP = 25;
const STEADY_FRAMES = 3;
const MAX_SETTLE_WAIT = 1500;

// Runs once frames come at a steady pace again, so nothing it starts gets cut short by a long
// frame such as a mount or the screen's first draw.
export function afterFramesSettle(run: () => void) {
    const start = performance.now();
    let last = start;
    let steady = 0;
    const tick = () => {
        const now = performance.now();
        steady = now - last < STEADY_FRAME_GAP ? steady + 1 : 0;
        last = now;
        if (steady >= STEADY_FRAMES || now - start > MAX_SETTLE_WAIT) run();
        else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// A GPU program compiled mid-animation drops frames, enough to skip a short effect entirely on a
// slow phone. Drawn once offscreen on the UI thread, which shares its GPU context with the
// canvases there, the frames leave their programs compiled. Mirrors RNSkPictureView's drawing.
export function primeArt(animations: SkSkottieAnimation[], frames: readonly number[], onDone: () => void) {
    const density = PixelRatio.get();
    runOnUI(() => {
        "worklet";
        try {
            const surface = Skia.Surface.MakeOffscreen(Math.ceil(ARTBOARD.width * density), Math.ceil(ARTBOARD.height * density));
            if (!surface) return;
            const canvas = surface.getCanvas();
            const bounds = Skia.XYWHRect(0, 0, ARTBOARD.width, ARTBOARD.height);
            const transparent = Skia.Color("transparent");
            for (const frame of frames) {
                const recorder = Skia.PictureRecorder();
                const recording = recorder.beginRecording(bounds);
                for (const animation of animations) {
                    animation.seekFrame(frame);
                    animation.render(recording);
                }
                const picture = recorder.finishRecordingAsPicture();
                canvas.clear(transparent);
                canvas.save();
                canvas.scale(density, density);
                canvas.drawPicture(picture);
                canvas.restore();
                surface.flush();
            }
            surface.dispose();
        } finally {
            scheduleOnRN(onDone);
        }
    })();
}

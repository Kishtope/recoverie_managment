import { cn } from "@/lib/utils";
import { BASE_PATH } from "@/lib/base-path";

/**
 * @component AppLoadingScreen
 * @description Full-screen loading pane shown over the whole application while the signed-in user is being fetched. Plays the official KishtoPe logo animation (किश्तोपे opens out of the seal and folds back, 7.4s loop) from the brand kit; people who prefer reduced motion get a blank pane with a screen-reader "Loading" label only.
 * @param className Extra classes merged onto the wrapper.
 */
export const AppLoadingScreen = ({ className }: { className?: string }) => (
  // The dark screen uses the brand navy (not the app's dark background) so it matches the MP4 exactly and no video edge shows.
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading"
    className={cn("fixed inset-0 z-50 flex items-center justify-center bg-[#FDF8F1] dark:bg-brand-navy", className)}
  >
    {/* Light theme: the MP4 has its own cream backdrop (~#FDF8F1, sampled from the render), so the wrapper uses that exact colour and no video edge shows. */}
    <video
      src={`${BASE_PATH}/brand/logo-animation-light.mp4`}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className="pointer-events-none aspect-video w-[min(92vw,44rem)] motion-reduce:hidden dark:hidden"
    />
    {/* Dark theme: the ink version of the same animation. */}
    <video
      src={`${BASE_PATH}/brand/logo-animation-dark.mp4`}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className="pointer-events-none hidden aspect-video w-[min(92vw,44rem)] motion-reduce:hidden dark:block"
    />
    <span className="sr-only">Loading</span>
  </div>
);

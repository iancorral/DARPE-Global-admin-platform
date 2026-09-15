import Image from "next/image";
import mascots from "../../../../public/brand/darpe-mascots-cutout.webp";

/**
 * The dashboard greeting, with DARPE's mascots peeking out from behind it.
 *
 * The illusion is the whole point, and it is made of three plain things:
 *
 * 1. The banner clips its own overflow, so anything below its bottom edge is
 *    simply not drawn.
 * 2. The mascots sit *below* that edge to start with, and slide up into view.
 *    They end still partly cut off, which is what sells "behind" — a character
 *    fully inside the box reads as a picture in a frame, not as someone
 *    leaning in.
 * 3. They enter with an overshoot, so they bob once at the top rather than
 *    gliding to a stop like a slideshow.
 *
 * No animation library. This is a transform and an opacity on one element;
 * shipping Lottie or Rive to every page for it would be a bad trade. If DARPE
 * later wants the mascots to blink, wave on demand, or react to the page,
 * that is the point to revisit — those need a real animation format, and an
 * illustrator to author it, not a bigger CSS file.
 *
 * A server component: nothing here needs state. The reveal used to wait on an
 * `onLoad` in the client, which meant shipping the component to the browser to
 * gate an animation on a 68 KB image that is fetched eagerly anyway.
 */
export function WelcomeBanner({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <section className="darpe-welcome relative mb-6 overflow-hidden rounded-xl border px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5">
      {/*
        The text column stops short of the mascots so a long greeting never
        runs underneath them. On a phone the pair is smaller and the column
        narrower — the greeting wraps to a second line, which reads fine, where
        hiding the mascots made the phone look like a different product.
      */}
      <div className="relative z-10 max-w-[calc(100%-7rem)] sm:max-w-[calc(100%-13rem)] lg:max-w-[calc(100%-16rem)]">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      <div
        aria-hidden="true"
        className="darpe-mascots pointer-events-none absolute right-2 -bottom-4 w-28 select-none sm:right-3 sm:-bottom-6 sm:w-44 lg:right-6 lg:w-56"
      >
        <Image
          src={mascots}
          alt=""
          priority
          sizes="(min-width: 1024px) 224px, (min-width: 640px) 176px, 112px"
          className="h-auto w-full"
        />
      </div>
    </section>
  );
}

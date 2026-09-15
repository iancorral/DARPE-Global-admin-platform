import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";
import wordmark from "../../../../public/brand/darpe-wordmark.webp";
import mascots from "../../../../public/brand/darpe-mascots-cutout.webp";

/**
 * The door into DARPE.
 *
 * Two panels on a desk, one column on a phone. The brand panel carries the
 * wordmark, one line in the editorial face and the mascots leaning in from
 * behind its bottom edge — the same trick the dashboard greeting uses, so the
 * first thing staff see and the first thing they see after signing in are
 * plainly the same product. The form sits on card white beside it, exactly as
 * every other form in the app does.
 *
 * Nothing here is dark violet. The brand ground is the pale lavender wash the
 * rest of the product sits on; the violet is the wordmark and the button.
 *
 * A server component: the only interactive part is the form.
 */
export default function LoginPage() {
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto grid min-h-svh w-full max-w-5xl content-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,24rem)] lg:items-center lg:gap-14 lg:px-8">
        <section className="darpe-login-brand relative overflow-hidden rounded-2xl border px-6 pt-6 pb-40 sm:px-8 sm:pt-8 sm:pb-44 lg:min-h-120 lg:pb-52">
          <Image src={wordmark} alt="DARPE" priority sizes="168px" className="h-auto w-42" />
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Global admin
          </p>

          {/*
            The mascots live in the padding reserved below the text at every
            width, so the headline keeps the full column — constrained beside
            them it broke into five one-word lines — and nothing is ever read
            through an alien.
          */}
          <div className="relative z-10 mt-10">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Every class, every student, one calendar.
            </h1>
            <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              Sign in to manage teachers, students and classes.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="darpe-mascots darpe-mascots-float pointer-events-none absolute right-4 -bottom-5 w-48 select-none sm:right-6 sm:w-56 lg:right-8 lg:w-72"
          >
            <Image
              src={mascots}
              alt=""
              priority
              sizes="(min-width: 1024px) 288px, (min-width: 640px) 224px, 192px"
              className="h-auto w-full"
            />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
          <h2 className="font-serif text-xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Enter your email and password.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}

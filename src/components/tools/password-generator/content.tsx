import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Generate strong random passwords and memorable passphrases with your browser's cryptographically secure random generator. Pick the length and character sets, or switch to a passphrase of words, and see the strength as real entropy in bits with an honest estimate of how long it would take to guess. The password is never sent anywhere or stored.",
  usesNote: "Never reuse a password again.",
  useCases: [
    {
      title: "New accounts",
      description: "A unique password for every sign-up, with symbols and numbers guaranteed when you turn them on — so it passes picky password rules first time.",
    },
    {
      title: "Passphrases",
      description: "Long, memorable phrases like Maple-Orbit-River7 for the ones you have to type: a laptop login, a password manager's master password.",
    },
    {
      title: "Secrets and keys",
      description: "Random strings for env files, test fixtures and API secrets. Copy ten at once from the ⋯ menu.",
    },
  ],
  faqs: [
    {
      question: "Is the password sent anywhere?",
      answer:
        "No. It's generated with crypto.getRandomValues, your browser's secure random generator, and never leaves the page. It isn't saved either — only your settings (length, character sets) are remembered in this browser.",
    },
    {
      question: "How is strength measured?",
      answer:
        "As entropy in bits: how many equally likely passwords the generator could have produced with your settings. Because every enabled character set is guaranteed to appear, the count excludes passwords that would miss one, so the number shown is exact rather than rounded up. Under 40 bits is weak, 60+ is strong and 80+ is very strong for online accounts.",
    },
    {
      question: "What does the time to guess assume?",
      answer:
        "An attacker trying 10 billion guesses a second — a fast offline attack against a leaked, weakly hashed password database — and finding it halfway through on average. Online logins with rate limits are far slower to attack.",
    },
    {
      question: "Password or passphrase?",
      answer:
        "Passphrases are easier to type and remember at the same strength. Each word comes from a list of 4,096 common English words, so it adds exactly 12 bits; five words plus a digit is about 63 bits. The digit's position and capitalisation aren't counted, so the estimate errs on the low side.",
    },
    {
      question: "What does Avoid look-alikes remove?",
      answer:
        "Characters that are easy to confuse when read aloud or typed from a screen: 0 and O, 1, l and I. The pool gets a little smaller, and the entropy shown accounts for that.",
    },
  ],
  relatedSlugs: ["uuid-generator", "jwt-decoder", "base64", "timestamp-converter"],
} as const;

export function PasswordGeneratorContent() {
  return <ToolContent {...seoData} />;
}

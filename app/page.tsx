import { Footer } from '@/components/footer'
import { SmsFilter } from '@/components/sms-filter'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-8 md:px-16 py-16 flex-1 flex flex-col max-w-7xl">
        <nav className="flex justify-end items-center">
          <ThemeToggle />
        </nav>
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <h1 className="font-poppins font-extrabold leading-tight tracking-tighter space-y-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl">
            SMS Filtering
          </h1>
          <h2 className="font-poppins font-light leading-tight tracking-tighter space-y-2 text-sm sm:text-lg md:text-xl lg:text-2xl">
            AI Filtering for SMS Scam Detection
          </h2>
          <SmsFilter />
        </div>
      </div>
      <Footer />
    </main>
  )
}

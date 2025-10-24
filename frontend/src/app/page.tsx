import { Navigation } from "../components/navigation"
import { Hero } from "../components/home/hero"
import { Features } from "../components/home/features"
import { Footer } from "../components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  )
}
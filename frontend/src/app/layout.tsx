import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Web3Provider } from "../components/providers/web3-provider"
import { APP_CONFIG } from "../lib/contracts/addresses"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Web3Provider>
          <div className="min-h-screen bg-background">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  )
}
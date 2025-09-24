import { useState } from "react"
import { Button } from "./ui/button"
import { MessageCircle, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeSwitcher } from "./ThemeSwitcher"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const scrollToChat = () => {
    // Trigger the chat widget to open
    const chatButton = document.querySelector('[data-chat-trigger]') as HTMLElement
    if (chatButton) {
      chatButton.click()
    }
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-xl tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
            F.B/<span style={{ color: 'hsl(var(--orange))' }}>c</span>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('services')} 
              className="hover:text-muted-foreground transition-colors" 
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              SERVICES
            </button>
            <button 
              onClick={() => scrollToSection('about')} 
              className="hover:text-muted-foreground transition-colors" 
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ABOUT
            </button>
            <button 
              onClick={() => scrollToSection('workshops')} 
              className="hover:text-muted-foreground transition-colors" 
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              WORKSHOPS
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="hover:text-muted-foreground transition-colors" 
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              CONTACT
            </button>
            <ThemeSwitcher />
            <Button 
              onClick={scrollToChat}
              className="bg-primary text-primary-foreground hover:bg-primary/90 relative" 
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              LET'S CHAT
              <div className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'hsl(var(--orange))' }}></div>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeSwitcher />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-8 w-8 p-0"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border"
          >
            <div className="px-6 py-4 space-y-4">
              <button 
                onClick={() => scrollToSection('services')} 
                className="block w-full text-left hover:text-muted-foreground transition-colors" 
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                SERVICES
              </button>
              <button 
                onClick={() => scrollToSection('about')} 
                className="block w-full text-left hover:text-muted-foreground transition-colors" 
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ABOUT
              </button>
              <button 
                onClick={() => scrollToSection('workshops')} 
                className="block w-full text-left hover:text-muted-foreground transition-colors" 
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                WORKSHOPS
              </button>
              <button 
                onClick={() => scrollToSection('contact')} 
                className="block w-full text-left hover:text-muted-foreground transition-colors" 
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                CONTACT
              </button>
              <Button 
                onClick={scrollToChat}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 relative" 
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                LET'S CHAT
                <div className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'hsl(var(--orange))' }}></div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

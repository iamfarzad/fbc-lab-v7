import { useState } from "react"
import { Button } from "./ui/button"
import { MessageCircle, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeSwitcher } from "./ThemeSwitcher"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

export function Navigation({ className, ...props }: ComponentProps<"nav">) {
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
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border",
        // Terminal theme enhancements
        "monochrome:monochrome-orange:bg-background/100 monochrome:monochrome-orange:border-l-4 monochrome:monochrome-orange:border-l-orange",
        "monochrome:monochrome-orange-dark:bg-background/100 monochrome:monochrome-orange-dark:border-l-4 monochrome:monochrome-orange-dark:border-l-primary",
        className
      )} 
      {...props}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className={cn(
            "text-xl tracking-wider",
            "font-display text-foreground",
            // Terminal theme enhancements
            "monochrome:monochrome-orange:font-mono monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-bold",
            "monochrome:monochrome-orange-dark:font-mono monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-bold"
          )}>
            <span className="monochrome:monochrome-orange:text-primary monochrome:monochrome-orange-dark:text-primary">F.B/</span>
            <span className={cn(
              "text-orange",
              // Terminal theme enhancements  
              "monochrome:monochrome-orange:text-primary monochrome:monochrome-orange-dark:text-primary"
            )}>c</span>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-10">
            <NavButton 
              onClick={() => scrollToSection('services')}
              className={cn(
                "font-mono text-sm",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
              )}
            >
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              SERVICES
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </NavButton>
            <NavButton 
              onClick={() => scrollToSection('about')}
              className={cn(
                "font-mono text-sm",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
              )}
            >
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              ABOUT
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </NavButton>
            <NavButton 
              onClick={() => scrollToSection('workshops')}
              className={cn(
                "font-mono text-sm",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
              )}
            >
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              WORKSHOPS
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </NavButton>
            <NavButton 
              onClick={() => scrollToSection('contact')}
              className={cn(
                "font-mono text-sm",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
              )}
            >
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              CONTACT
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </NavButton>
            <div className={cn(
              "w-px h-6 bg-border mx-2",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:bg-primary monochrome:monochrome-orange-dark:bg-primary"
            )} />
            <ThemeSwitcher />
            <Button 
              onClick={scrollToChat}
              className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90 relative",
                "font-mono text-sm px-4 py-2",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:bg-primary monochrome:monochrome-orange:text-primary-foreground monochrome:monochrome-orange:border-2 monochrome:monochrome-orange:border-primary monochrome:monochrome-orange:font-bold",
                "monochrome:monochrome-orange-dark:bg-primary monochrome:monochrome-orange-dark:text-primary-foreground monochrome:monochrome-orange-dark:border-2 monochrome:monochrome-orange-dark:border-primary monochrome:monochrome-orange-dark:font-bold"
              )}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              LET'S CHAT
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              <div className={cn(
                "absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full",
                "bg-orange",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:bg-primary monochrome:monochrome-orange:rounded-none monochrome:monochrome-orange:h-2 monochrome:monochrome-orange:w-2",
                "monochrome:monochrome-orange-dark:bg-primary monochrome:monochrome-orange-dark:rounded-none monochrome:monochrome-orange-dark:h-2 monochrome:monochrome-orange-dark:w-2"
              )} />
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeSwitcher />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "h-8 w-8 p-0",
                // Terminal theme enhancements
                "monochrome:monochrome-orange:bg-background monochrome:monochrome-orange:border monochrome:monochrome-orange:border-border monochrome:monochrome-orange:rounded-none",
                "monochrome:monochrome-orange-dark:bg-background monochrome:monochrome-orange-dark:border monochrome:monochrome-orange-dark:border-border monochrome:monochrome-orange-dark:rounded-none"
              )}
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
            className={cn(
              "md:hidden bg-background/95 backdrop-blur-sm border-b border-border",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:bg-background/100 monochrome:monochrome-orange:border-l-4 monochrome:monochrome-orange:border-l-primary",
              "monochrome:monochrome-orange-dark:bg-background/100 monochrome:monochrome-orange-dark:border-l-4 monochrome:monochrome-orange-dark:border-l-primary"
            )}
          >
            <div className="px-6 py-4 space-y-4">
              <MobileNavButton 
                onClick={() => scrollToSection('services')}
                className={cn(
                  "font-mono",
                  // Terminal theme enhancements
                  "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                  "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
                )}
              >
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                SERVICES
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              </MobileNavButton>
              <MobileNavButton 
                onClick={() => scrollToSection('about')}
                className={cn(
                  "font-mono",
                  // Terminal theme enhancements
                  "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                  "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
                )}
              >
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                ABOUT
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              </MobileNavButton>
              <MobileNavButton 
                onClick={() => scrollToSection('workshops')}
                className={cn(
                  "font-mono",
                  // Terminal theme enhancements
                  "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                  "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
                )}
              >
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                WORKSHOPS
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              </MobileNavButton>
              <MobileNavButton 
                onClick={() => scrollToSection('contact')}
                className={cn(
                  "font-mono",
                  // Terminal theme enhancements
                  "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
                  "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
                )}
              >
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                CONTACT
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              </MobileNavButton>
              <Button 
                onClick={scrollToChat}
                className={cn(
                  "w-full bg-primary text-primary-foreground hover:bg-primary/90 relative",
                  "font-mono",
                  // Terminal theme enhancements
                  "monochrome:monochrome-orange:bg-primary monochrome:monochrome-orange:text-primary-foreground monochrome:monochrome-orange:border-2 monochrome:monochrome-orange:border-primary monochrome:monochrome-orange:font-bold",
                  "monochrome:monochrome-orange-dark:bg-primary monochrome:monochrome-orange-dark:text-primary-foreground monochrome:monochrome-orange-dark:border-2 monochrome:monochrome-orange-dark:border-primary monochrome:monochrome-orange-dark:font-bold"
                )}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                LET'S CHAT
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
                <div className={cn(
                  "absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full",
                  "bg-orange",
                  // Terminal theme enhancements
                  "monochrome:monochrome-orange:bg-primary monochrome:monochrome-orange:rounded-none monochrome:monochrome-orange:h-2 monochrome:monochrome-orange:w-2",
                  "monochrome:monochrome-orange-dark:bg-primary monochrome:monochrome-orange-dark:rounded-none monochrome:monochrome-orange-dark:h-2 monochrome:monochrome-orange-dark:w-2"
                )} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

// Helper component for desktop navigation buttons
function NavButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button 
      className={cn(
        "hover:text-muted-foreground transition-colors text-foreground",
        className
      )} 
      {...props}
    >
      {children}
    </button>
  )
}

// Helper component for mobile navigation buttons
function MobileNavButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button 
      className={cn(
        "block w-full text-left hover:text-muted-foreground transition-colors text-foreground",
        className
      )} 
      {...props}
    >
      {children}
    </button>
  )
}

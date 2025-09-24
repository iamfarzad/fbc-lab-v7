import { Mail, Phone, MapPin, Linkedin, Twitter, Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="text-2xl tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              F.B/<span style={{ color: 'hsl(var(--orange))' }}>c</span>
            </div>
            <div className="text-muted-foreground mb-6 max-w-md" style={{ fontFamily: 'var(--font-serif)' }}>
              AI Consultant & Workshop Facilitator helping organizations navigate the AI landscape 
              through strategic consulting and hands-on implementation guidance.
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
              SERVICES
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
                  AI Strategy Consulting
                </a>
              </li>
              <li>
                <a href="#workshops" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
                  Team Workshops
                </a>
              </li>
              <li>
                <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
                  Implementation Support
                </a>
              </li>
              <li>
                <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-sans)' }}>
                  Custom Solutions
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
              CONTACT
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                  hello@fbc-ai.com
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                  +1 (555) 123-4567
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                  San Francisco, CA
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground mb-4 md:mb-0" style={{ fontFamily: 'var(--font-mono)' }}>
              © 2024 F.B/c AI Consultant. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
                PRIVACY POLICY
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
                TERMS OF SERVICE
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-mono)' }}>
                CONTACT
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

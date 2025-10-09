import { Mail, Phone, MapPin, Linkedin, Twitter, Github } from "lucide-react"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

interface FooterProps extends ComponentProps<"footer"> {}

export function Footer({ className, ...props }: FooterProps) {
  return (
    <footer 
      className={cn(
        "bg-background border-t border-border",
        // Terminal theme enhancements
        "monochrome:monochrome-orange:bg-background/100 monochrome:monochrome-orange:border-t-4 monochrome:monochrome-orange:border-t-orange",
        "monochrome:monochrome-orange-dark:bg-background/100 monochrome:monochrome-orange-dark:border-t-4 monochrome:monochrome-orange-dark:border-t-primary",
        className
      )} 
      {...props}
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo and Description */}
          <div className="md:col-span-2 space-y-6">
            <div className={cn(
              "text-2xl tracking-wider",
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
            <p className={cn(
              "text-muted-foreground max-w-md leading-relaxed",
              "font-serif",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:font-mono monochrome:monochrome-orange:text-muted-foreground monochrome:monochrome-orange:leading-normal monochrome:monochrome-orange:tracking-wide",
              "monochrome:monochrome-orange-dark:font-mono monochrome:monochrome-orange-dark:text-muted-foreground monochrome:monochrome-orange-dark:leading-normal monochrome:monochrome-orange-dark:tracking-wide"
            )}>
              AI Consultant & Workshop Facilitator helping organizations navigate the AI landscape 
              through strategic consulting and hands-on implementation guidance.
            </p>
            <div className={cn(
              "flex space-x-6",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:space-x-4 monochrome:monochrome-orange-dark:space-x-4"
            )}>
              <SocialLink href="#" icon={Linkedin} />
              <SocialLink href="#" icon={Twitter} />
              <SocialLink href="#" icon={Github} />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className={cn(
              "text-lg font-semibold",
              "font-mono text-foreground",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-bold monochrome:monochrome-orange:tracking-wide",
              "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-bold monochrome:monochrome-orange-dark:tracking-wide"
            )}>
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              SERVICES
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </h3>
            <ul className="space-y-3">
              <FooterLink href="#services">AI Strategy Consulting</FooterLink>
              <FooterLink href="#workshops">Team Workshops</FooterLink>
              <FooterLink href="#services">Implementation Support</FooterLink>
              <FooterLink href="#contact">Custom Solutions</FooterLink>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className={cn(
              "text-lg font-semibold",
              "font-mono text-foreground",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:text-foreground monochrome:monochrome-orange:font-bold monochrome:monochrome-orange:tracking-wide",
              "monochrome:monochrome-orange-dark:text-foreground monochrome:monochrome-orange-dark:font-bold monochrome:monochrome-orange-dark:tracking-wide"
            )}>
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              CONTACT
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </h3>
            <div className="space-y-4">
              <ContactItem icon={Mail} text="contact@farzadbayat.com" />
              <ContactItem icon={Phone} text="+47 94446446" />
              <ContactItem icon={MapPin} text="Oslo, Norway & Remote" />
            </div>
          </div>
        </div>

        <div className={cn(
          "border-t border-border mt-12 pt-8",
          // Terminal theme enhancements
          "monochrome:monochrome-orange:border-t-2 monochrome:monochrome-orange:border-primary monochrome:monochrome-orange-dark:border-t-2 monochrome:monochrome-orange-dark:border-primary"
        )}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className={cn(
              "text-sm text-muted-foreground",
              "font-mono",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:text-muted-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide",
              "monochrome:monochrome-orange-dark:text-muted-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide"
            )}>
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
              © 2024 F.B/c AI Consultant. All rights reserved.
              <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
            </div>
            <div className={cn(
              "flex space-x-8 text-sm",
              // Terminal theme enhancements
              "monochrome:monochrome-orange:space-x-6 monochrome:monochrome-orange-dark:space-x-6"
            )}>
              <FooterLink href="#">
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                PRIVACY POLICY
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              </FooterLink>
              <FooterLink href="#">
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                TERMS OF SERVICE
                <span className="monochrome:monochrome-orange-dark:inline">]</span>
              </FooterLink>
              <FooterLink href="#contact">
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
                CONTACT
                <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
              </FooterLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Helper components
interface SocialLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  className?: string
}

function SocialLink({ href, icon: Icon, className }: SocialLinkProps) {
  return (
    <a 
      href={href} 
      className={cn(
        "text-muted-foreground hover:text-foreground transition-colors",
        // Terminal theme enhancements
        "monochrome:monochrome-orange:text-muted-foreground monochrome:monochrome-orange:hover:text-primary monochrome:monochrome-orange:border monochrome:monochrome-orange:border-border monochrome:monochrome-orange:rounded-none monochrome:monochrome-orange:p-2 monochrome:monochrome-orange:bg-background",
        "monochrome:monochrome-orange-dark:text-muted-foreground monochrome:monochrome-orange-dark:hover:text-primary monochrome:monochrome-orange-dark:border monochrome:monochrome-orange-dark:border-border monochrome:monochrome-orange-dark:rounded-none monochrome:monochrome-orange-dark:p-2 monochrome:monochrome-orange-dark:bg-background",
        className
      )}
    >
      <Icon className={cn(
        "h-5 w-5",
        // Terminal theme enhancements
        "monochrome:monochrome-orange:h-4 monochrome:monochrome-orange:w-4 monochrome:monochrome-orange:text-primary",
        "monochrome:monochrome-orange-dark:h-4 monochrome:monochrome-orange-dark:w-4 monochrome:monochrome-orange-dark:text-primary"
      )} />
    </a>
  )
}

interface FooterLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

function FooterLink({ href, children, className }: FooterLinkProps) {
  return (
    <li>
      <a 
        href={href} 
        className={cn(
          "text-muted-foreground hover:text-foreground transition-colors",
          "font-sans",
          // Terminal theme enhancements
          "monochrome:monochrome-orange:font-mono monochrome:monochrome-orange:text-muted-foreground monochrome:monochrome-orange:hover:text-primary monochrome:monochrome-orange:tracking-wide",
          "monochrome:monochrome-orange-dark:font-mono monochrome:monochrome-orange-dark:text-muted-foreground monochrome:monochrome-orange-dark:hover:text-primary monochrome:monochrome-orange-dark:tracking-wide",
          className
        )}
      >
        {children}
      </a>
    </li>
  )
}

interface ContactItemProps {
  icon: React.ComponentType<{ className?: string }>
  text: string
  className?: string
}

function ContactItem({ icon: Icon, text, className }: ContactItemProps) {
  return (
    <div className={cn(
      "flex items-center space-x-2",
      // Terminal theme enhancements
      "monochrome:monochrome-orange:space-x-3 monochrome:monochrome-orange-dark:space-x-3",
      className
    )}>
      <Icon className={cn(
        "h-4 w-4 text-muted-foreground",
        // Terminal theme enhancements
        "monochrome:monochrome-orange:text-primary monochrome:monochrome-orange:h-3 monochrome:monochrome-orange:w-3",
        "monochrome:monochrome-orange-dark:text-primary monochrome:monochrome-orange-dark:h-3 monochrome:monochrome-orange-dark:w-3"
      )} />
      <span className={cn(
        "text-muted-foreground text-sm",
        "font-mono",
        // Terminal theme enhancements
        "monochrome:monochrome-orange:text-muted-foreground monochrome:monochrome-orange:font-semibold monochrome:monochrome-orange:tracking-wide monochrome:monochrome-orange:text-xs",
        "monochrome:monochrome-orange-dark:text-muted-foreground monochrome:monochrome-orange-dark:font-semibold monochrome:monochrome-orange-dark:tracking-wide monochrome:monochrome-orange-dark:text-xs"
      )}>
        <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">[</span>
        {text}
        <span className="monochrome:monochrome-orange:hidden monochrome:monochrome-orange-dark:inline">]</span>
      </span>
    </div>
  )
}

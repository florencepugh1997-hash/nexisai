import { BackArrow } from '@/components/app/back-arrow'
import { Card } from '@/components/ui/card'
import { Phone, Mail, MessageCircle, Info } from 'lucide-react'
import Link from 'next/link'

const faqs = [
  {
    q: "How does the 14-day free trial work?",
    a: "You get full access to all Nexis features for 14 days with no credit card required. After 14 days you can subscribe to keep access to your growth plan and daily journey."
  },
  {
    q: "How is my growth plan generated?",
    a: "Nexis uses advanced AI to analyze your business profile and generate a personalized 90-day growth strategy tailored specifically to your industry, audience, and goals."
  },
  {
    q: "Can I change my business details after onboarding?",
    a: "Currently your business profile is set during onboarding. Contact our support team if you need to update your business details."
  },
  {
    q: "How does the daily plan system work?",
    a: "Each day you get a personalized task that builds on the previous day. A new day unlocks 16 hours after you open the current day's plan. The AI uses your daily progress submissions to make each next day more relevant."
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data is safely stored. If you resubscribe, everything is exactly where you left it."
  }
]

export default function HelpCenterPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div className="flex flex-col gap-1 relative">
        <BackArrow href="/settings" className="mb-4 self-start" />
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Help & Support
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          We're here to help you get the most out of Nexis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Support Card Area */}
        <div className="md:col-span-1 space-y-4">
          <Card className="p-6 rounded-2xl border-border/60 bg-card/60 flex flex-col items-center text-center shadow-sm space-y-4">
            <div className="p-3 bg-primary/10 text-primary rounded-full">
               <Info className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg mb-1">Contact Support</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 We typically respond within 24 hours
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 mt-4">
               <a href="tel:07040171691" className="flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-muted/50 transition-colors group">
                 <Phone className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                 <span className="text-sm font-medium">07040171691</span>
               </a>
               
               <a href="mailto:ezejustin792@gmail.com" className="flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-muted/50 transition-colors group">
                 <Mail className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                 <span className="text-sm font-medium">ezejustin792@gmail.com</span>
               </a>

               <a href="https://wa.me/2347040171691" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-green-500/10 text-green-600 dark:text-green-500 rounded-xl hover:bg-green-500/20 transition-colors">
                 <MessageCircle className="w-4 h-4" />
                 <span className="text-sm font-medium">WhatsApp Us</span>
               </a>
            </div>
          </Card>
        </div>

        {/* FAQ Area */}
        <div className="md:col-span-2 space-y-4">
           {faqs.map((faq, idx) => (
             <Card key={idx} className="p-5 md:p-6 rounded-2xl border-border/60 shadow-sm bg-card hover:border-primary/20 transition-colors">
               <h4 className="font-semibold text-foreground">{faq.q}</h4>
               <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
             </Card>
           ))}
        </div>

      </div>
    </div>
  )
}

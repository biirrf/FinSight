// using react hook form, shad cn UI

import Link from "next/link"
import Image from "next/image"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/better-auth/auth"

// Children contains the form data for sign-in/sign-up
const Layout = async ({children}: {children : React.ReactNode}) => {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (session?.user) redirect('/');
 
    return (
    <main className="auth-layout">
        <section className="auth-left-section scrollbar-hide-default">
            <Link href = "/" className="auth-logo">
                <Image src="/assets/icons/logo3.svg" alt="FinSight Logo" width={140} height={32} className='h-8 w-auto' />  
            </Link>

            <div className="pb-6 lg:pb-8 flex-1">
                {children}
            </div>

        </section>
        <section className="auth-right-section">
            <div className="z-10 relative lg:mt-4 lg:mb-16"> 
                <blockquote className="auth-blockquote">
                    FinSight helped me see market trends at a glance. The dashboards are clean and load fast. Useful for quick decisions.
                </blockquote>
                <div className="flex items-center justify-between">
                    <div>
                        <cite className="auth-testimonial-author">- Hannah B.</cite>
                        <p className="max-md:text-xs text-gray-500">Quant</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((star) => (
                            <Image src = "/assets/icons/star.svg" alt = "Star Icon" key = {star} width = {20} height = {20} className="w-5 h-5"/>      
                        ))}
                    </div>   
                </div>   
            </div>

            <div className="flex-1 relative">
                <div className="auth-placeholder absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-8">
                    <div className="text-center">
                        <Image src="/assets/icons/logo3.svg" alt="FinSight Logo" width={140} height={32} className='mx-auto mb-4' />
                        <p className="text-gray-400 max-w-xs mx-auto">Secure market insights, curated for you. Sign up to get personalized summaries, alerts, and watchlists.</p>
                    </div>
                </div>
            </div>
        </section>   
    </main>
  )
}

export default Layout

'use server'

import { auth } from "../better-auth/auth";
import { inngest } from "../inngest/client";
import { headers } from "next/headers";

export const signUpWithEmail = async ({email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry}: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: fullName,
            }
        })

        if (response) {
            try {
                const eventData = {
                    email,
                    name: fullName,
                    country,
                    investmentGoals,
                    riskTolerance,
                    preferredIndustry
                };
                console.log('[Signup] Sending app/user.created event:', { email, name: fullName });
                await inngest.send({
                    name: 'app/user.created',
                    data: eventData
                });
                console.log('[Signup] Event sent successfully for:', email);
            } catch (evErr) {
                // Log event-send errors but don't fail the entire sign-up flow
                console.error('[Signup] Inngest event send failed:', {
                    email,
                    error: evErr instanceof Error ? evErr.message : String(evErr),
                    stack: evErr instanceof Error ? evErr.stack : undefined,
                    eventKeyConfigured: !!process.env.INNGEST_EVENT_KEY,
                    apiKeyConfigured: !!process.env.INNGEST_API_KEY,
                });
            }
        }

        return { success: true, data: response };
        } catch (error) {
            console.error("Error during sign-up:", error)
            return { success: false, message: 'Sign-up failed. Please try again.' } 
        }

    }

export const signInWithEmail = async ({email, password}: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({
            body: {
                email,
                password,
            }
        })

        return { success: true, data: response };
        } catch (error) {
            console.error("Error during sign-up:", error)
            return { success: false, message: 'Sign-up failed. Please try again.' } 
        }

    }

export const signOut = async () => {
        try {
            await auth.api.signOut({headers: await headers()});
            return { success: true };
        } catch (error) {
            console.error("Error during sign-in:", error);
            return { success: false, message: 'Sign-in failed. Please try again.' };
        }  
    } 


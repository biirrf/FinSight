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
                await inngest.send({
                    name: 'app/user.created',
                    data: {
                        email,
                        name: fullName,
                        country,
                        investmentGoals,
                        riskTolerance,
                        preferredIndustry
                    }
                });
            } catch (evErr) {
                // Log event-send errors but don't fail the entire sign-up flow
                console.error('Inngest event send failed:', evErr);
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


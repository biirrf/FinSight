'use client'

import {CountrySelectField} from "@/components/form/CountrySelectField";
import FooterLink from "@/components/form/FooterLink";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { useForm } from "react-hook-form";

const SignUpPage = () => {

    const { register, handleSubmit, control, formState: { errors,isSubmitting } } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',   
            country: '',
            investmentGoals: '',
            riskTolerance: '',
            preferredIndustry: ''
        }, mode: 'onBlur'
    });
    const onSubmit = async(data: SignUpFormData) => {
        try {
            console.log("Form submitted:", data);
            // Handle form submission logic here, e.g., send data to the server
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };
    
    return (
    <>
      <h1 className="form-title">Sign Up & Personalise</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="fullName"
          label="Full Name"
          placeholder="Enter your full name"
          register={register}
          error={errors.fullName}
          validation={{ required: "Full name is required", minLength: { value: 2, message: "Name must be at least 2 characters" }}}
        />

        <InputField
          name="email"
          label="Email"
          placeholder="Enter your email address"
          register={register}
          error={errors.email}
          validation={{ required: "Email address is required", pattern: { value: /^\S+@\S+$/i, message: "Please enter a valid email address" } }}
        />

        <InputField
          name="password"
          label="Password"
          placeholder="Create a secure password"
          type = "password"
          register={register}
          error={errors.password}
          validation={{ 
            required: "Password is required", 
            minLength: { 
              value: 8, 
              message: "Password must be at least 8 characters" 
            }
          }}
        />

        <CountrySelectField 
          name="country" 
          label="Country" 
          control={control} 
          error={errors.country} 
          required
        />

        <SelectField
          name="investmentGoals"
          label="Investment Goals"
          placeholder="Select your investment objectives"
          options={INVESTMENT_GOALS}
          control={control}
          error={errors.investmentGoals}
          required
        />

        
        <SelectField
          name="riskTolerance"
          label="Risk Tolerance"
          placeholder="Select your risk tolerance level"
          options={RISK_TOLERANCE_OPTIONS}
          control={control}
          error={errors.riskTolerance}
          required
        />

        <SelectField
          name="preferredIndustry"
          label="Preferred Industry"
          placeholder="Select your preferred industry sector"
          options={PREFERRED_INDUSTRIES}
          control={control}
          error={errors.preferredIndustry}
          required
        />

        <Button type ="submit" className="yellow-btn w-full mt-5" disabled={isSubmitting}>
          {isSubmitting ? "Creating account" : "Welcome to FinSight!"}
        </Button>

        <FooterLink text = "Already have an account?" linkText="Sign In" href="/sign-in" />
      
      </form>
    </>
  )
}

export default SignUpPage; 

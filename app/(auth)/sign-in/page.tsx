'use client'

import FooterLink from "@/components/form/FooterLink";
import InputField from "@/components/form/InputField";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";

type SignInFormData = {
  email: string;
  password: string;
};

const SignInPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur'
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      console.log("Form submitted:", data);
      // Handle sign-in logic here
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <>
      <h1 className="form-title">Welcome Back!</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="email"
          label="Email"
          placeholder="youremail@whatever.com"
          register={register}
          error={errors.email}
          validation={{
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+$/i,
              message: "Invalid email address"
            }
          }}
        />

        <InputField
          name="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
          register={register}
          error={errors.password}
          validation={{
            required: "Password is required"
          }}
        />

        <Button
          type="submit"
          className="yellow-btn w-full mt-5"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>

        <FooterLink
          text="Don't have an account?"
          linkText="Sign Up"
          href="/sign-up"
        />
      </form>
    </>
  );
};

export default SignInPage;

'use client'

import FooterLink from "@/components/form/FooterLink";
import InputField from "@/components/form/InputField";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInWithEmail } from "@/lib/actions/auth.actions";

type SignInFormData = {
  email: string;
  password: string;
};

const SignInPage = () => {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur'
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await signInWithEmail(data);
      if (result.success) {
        toast.success('Signed in! Redirecting...');
        setTimeout(() => router.push('/'), 800);
        return;
      }
      toast.error(result.message || 'Sign in failed. Please try again.');
    } catch (error) {
      console.error(error);
      toast.error('Sign in failed. Please try again.', {
        description: error instanceof Error ? error.message : 'Failed to sign in.',
      });
    }
  };

  /*const onSubmit = async (data: SignUpFormData) => {
      try {
        const result = await signUpWithEmail(data);

        if (result.success) {
          toast.success('Account created! Redirecting...');
          // Give the user a short moment to see the toast before redirecting
          setTimeout(() => router.push('/'), 800);
          return;
        }

        // If the server returned a failure, show the message if available
        toast.error(result.message || 'Sign up failed. Please try again.');
      } catch (error) {
        console.error('Error submitting form:', error);
        const msg = error instanceof Error ? error.message : 'Failed to create an account.';
        toast.error('Sign up failed. Please try again.');
        console.error(msg);
      }
    };
    */

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

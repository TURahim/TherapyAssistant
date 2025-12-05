import { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a new Tava Health account',
};

export default function SignupPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join Tava Health to start your journey
        </p>
      </div>
      <SignupForm />
    </div>
  );
}


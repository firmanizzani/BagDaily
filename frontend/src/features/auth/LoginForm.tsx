import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export type LoginFormValues = z.infer<typeof schema>;

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="block text-xs font-semibold text-[#001524] mb-1"
        >
          Email
        </label>
        <Input
          type="email"
          id="login-email"
          autoComplete="username"
          placeholder="nama@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="block text-xs font-semibold text-[#001524] mb-1"
        >
          Password
        </label>
        <Input
          type="password"
          id="login-password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <Button
        type="submit"
        variant="default"
        size="lg"
        className="w-full mt-2"
        disabled={isLoading}
      >
        {isLoading ? 'Memproses Masuk…' : 'Masuk Sekarang'}
      </Button>
    </form>
  );
}

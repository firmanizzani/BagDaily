import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export type RegisterFormValues = z.infer<typeof schema>;

export interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function RegisterForm({ onSubmit, isLoading = false }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="register-name"
          className="block text-xs font-semibold text-[#001524] mb-1"
        >
          Nama Lengkap
        </label>
        <Input
          type="text"
          id="register-name"
          autoComplete="name"
          placeholder="Contoh: Budi Santoso"
          error={errors.name?.message}
          {...register('name')}
        />
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="block text-xs font-semibold text-[#001524] mb-1"
        >
          Email
        </label>
        <Input
          type="email"
          id="register-email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="block text-xs font-semibold text-[#001524] mb-1"
        >
          Password
        </label>
        <Input
          type="password"
          id="register-password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
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
        {isLoading ? 'Mendaftarkan Akun…' : 'Daftar Sekarang'}
      </Button>
    </form>
  );
}

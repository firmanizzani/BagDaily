import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useRegister } from '@/features/auth/useAuth';
import { RegisterForm, type RegisterFormValues } from '@/features/auth/RegisterForm';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerAction = useRegister();

  const handleRegister = async (data: RegisterFormValues) => {
    try {
      const res = await registerAction.mutateAsync(data);
      toast.success(`Akun berhasil dibuat. Selamat datang, ${res.data.name}!`);
      navigate('/', { replace: true });
    } catch {
      return;
    }
  };

  return (
    <div className="auth-page register-page">
      <aside className="auth-story register-story">
        <div>
          <h2>
            Teman baru,
            <br />
            cerita baru.
          </h2>
          <p>Satu akun untuk menemukan tas favorit dan menemani setiap langkahmu.</p>
        </div>
      </aside>
      <div className="auth-form">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#001524]">Daftar akun baru</h1>
          <p className="text-xs text-[#6E7E8D] mt-1">
            Mulai langkah pertamamu bersama BagDaily.
          </p>
        </div>

        <RegisterForm onSubmit={handleRegister} isLoading={registerAction.isPending} />

        <div className="mt-6 border-t border-[#001524]/10 pt-4 text-center text-xs text-[#6E7E8D]">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-[#15616D] hover:underline">
            Masuk ke Akun
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAction, useUser } from '@/hooks/api';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
const schema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
    phone: z.string().max(30),
    address: z.string().max(1000),
    currentPassword: z.string(),
    password: z
      .string()
      .refine(
        v => !v || (v.length >= 8 && new TextEncoder().encode(v).length <= 72),
        'Password harus minimal 8 karakter dan maksimal 72 byte.',
      ),
    confirmation: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.password && !v.currentPassword)
      ctx.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Masukkan password saat ini.',
      });
    if (v.password !== v.confirmation)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmation'],
        message: 'Konfirmasi password belum sama.',
      });
  });
type Values = z.infer<typeof schema>;
export function ProfilePage({
  section = 'all',
}: {
  section?: 'profile' | 'address' | 'settings' | 'all';
}) {
  const user = useUser();
  const action = useAction();
  const [visible, setVisible] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: user.data?.name || '',
      phone: user.data?.phone || '',
      address: user.data?.address || '',
      currentPassword: '',
      password: '',
      confirmation: '',
    },
  });
  if (user.isLoading) return <LoadingState />;
  if (!user.data) return <ErrorState message="Sesi berakhir. Silakan masuk kembali." />;
  const address = section === 'address';
  const settings = section === 'settings';
  const title = address
    ? 'Alamat pengiriman'
    : settings
      ? 'Pengaturan akun'
      : section === 'all'
        ? 'Pengaturan akun'
        : 'Profil saya';
  const description = address
    ? 'Simpan alamat utama agar belanja berikutnya lebih praktis.'
    : settings
      ? 'Jaga akunmu tetap aman dan nyaman digunakan.'
      : 'Lengkapi informasi pribadimu untuk pengalaman belanja yang lebih mudah.';
  const FieldError = ({ name }: { name: keyof Values }) =>
    form.formState.errors[name] ? (
      <p role="alert" className="field-error">
        {form.formState.errors[name]?.message}
      </p>
    ) : null;
  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </div>
      <form
        className="panel account-form"
        onSubmit={form.handleSubmit(async values => {
          if (settings && !values.password) {
            toast.info('Isi password baru untuk memperbarui keamanan akun.');
            return;
          }
          try {
            await action.mutateAsync({
              path: '/auth/profile',
              method: 'PATCH',
              body: {
                name: values.name,
                phone: values.phone,
                address: values.address,
                ...(values.password
                  ? { password: values.password, currentPassword: values.currentPassword }
                  : {}),
              },
            });
            form.reset({
              ...values,
              currentPassword: '',
              password: '',
              confirmation: '',
            });
            toast.success(
              address
                ? 'Alamat pengiriman berhasil disimpan.'
                : settings
                  ? 'Password berhasil diperbarui.'
                  : 'Informasi akun berhasil disimpan.',
            );
          } catch {
            return;
          }
        })}
      >
        {!settings && (
          <>
            <div className="account-form-title">
              {address ? <MapPin size={21} /> : <UserRound size={21} />}
              <div>
                <h2>{address ? 'Alamat utama' : 'Informasi pribadi'}</h2>
                <p>
                  {address
                    ? 'Alamat ini dapat digunakan saat checkout.'
                    : 'Pastikan data kontakmu selalu terbaru.'}
                </p>
              </div>
            </div>
            <div className="account-fields">
              <label className="field">
                {address ? 'Nama penerima' : 'Nama lengkap'}
                <input autoComplete="name" {...form.register('name')} />
                <FieldError name="name" />
              </label>
              <label className="field">
                Nomor telepon
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  autoComplete="tel"
                  {...form.register('phone')}
                />
                <FieldError name="phone" />
              </label>
              {!address && (
                <label className="field account-wide">
                  Email
                  <input value={user.data.email} type="email" disabled />
                  <span className="field-hint">
                    Email terhubung dengan akun masuk Anda.
                  </span>
                </label>
              )}
              {(address || section === 'all') && (
                <label className="field account-wide">
                  Alamat lengkap
                  <textarea
                    placeholder="Nama jalan, nomor rumah, kelurahan, kecamatan, kota, provinsi, dan kode pos"
                    autoComplete="street-address"
                    rows={4}
                    {...form.register('address')}
                  />
                  <FieldError name="address" />
                  <span className="field-hint">
                    Detail alamat bisa disesuaikan lagi saat checkout.
                  </span>
                </label>
              )}
            </div>
          </>
        )}
        {(settings || section === 'all') && (
          <div className="security-section">
            <div className="account-form-title">
              <ShieldCheck size={22} />
              <div>
                <h2>Keamanan akun</h2>
                <p>
                  {settings
                    ? 'Perbarui password untuk melindungi akunmu.'
                    : 'Kosongkan bagian ini jika tidak ingin mengubah password.'}
                </p>
              </div>
            </div>
            {settings && (
              <div className="account-email">
                <span>Email akun</span>
                <strong>{user.data.email}</strong>
              </div>
            )}
            <div className="password-fields">
              {[
                {
                  name: 'currentPassword' as const,
                  label: 'Password saat ini',
                  autoComplete: 'current-password',
                },
                {
                  name: 'password' as const,
                  label: 'Password baru',
                  autoComplete: 'new-password',
                },
                {
                  name: 'confirmation' as const,
                  label: 'Konfirmasi password baru',
                  autoComplete: 'new-password',
                },
              ].map(f => (
                <label className="field" key={f.name}>
                  {f.label}
                  <div className="password-input">
                    <input
                      type={visible ? 'text' : 'password'}
                      autoComplete={f.autoComplete}
                      placeholder={f.label}
                      {...form.register(f.name)}
                    />
                    <button
                      type="button"
                      aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <FieldError name={f.name} />
                </label>
              ))}
            </div>
            <p className="field-hint">
              Gunakan minimal 8 karakter. Hindari memakai password yang sama dengan akun
              lain.
            </p>
          </div>
        )}
        <div className="account-save">
          <span>Perubahan tersimpan ke akun BagDaily Anda.</span>
          <Button type="submit" variant="teal" disabled={action.isPending}>
            {action.isPending
              ? 'Menyimpan…'
              : address
                ? 'Simpan alamat'
                : settings
                  ? 'Perbarui password'
                  : 'Simpan perubahan'}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FolderKanban, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'

const schema = z
  .object({
    email: z.string().email('Invalid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    full_name: z.string().min(1, 'Full name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, login, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        password: data.password,
      })
      await login({ email: data.email, password: data.password })
      toast.success('Account created successfully!')
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error?.response?.data?.detail ?? 'Registration failed')
    }
  }

  const inputClass = "h-11 rounded-xl border-[var(--color-sand-dark)] focus:border-[var(--color-terracotta)] focus:ring-[var(--color-terracotta)]"

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #7D8B6A 0%, #96A580 40%, #C2754F 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.2) 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 text-white text-center px-12 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-8">
            <FolderKanban className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold font-serif mb-4">Join ProjectFlow</h1>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Start managing your projects with a beautiful, intuitive workspace designed for teams.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}>
              <FolderKanban className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold font-serif" style={{ color: 'var(--color-coffee)' }}>ProjectFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold font-serif" style={{ color: 'var(--color-coffee)' }}>Create an account</h2>
            <p className="text-muted-foreground mt-1">Join ProjectFlow to manage your projects</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-terracotta)', opacity: step === 1 ? 1 : 0.25 }} />
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2 animate-slide-up animate-stagger-1">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" placeholder="John Doe" className={inputClass} {...register('full_name')} />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-2 animate-slide-up animate-stagger-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="johndoe" className={inputClass} {...register('username')} />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2 animate-slide-up animate-stagger-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" className={inputClass} {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 animate-slide-up animate-stagger-4">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" className={inputClass} {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2 animate-slide-up animate-stagger-5">
                <Label htmlFor="confirm_password">Confirm</Label>
                <Input id="confirm_password" type="password" placeholder="••••••••" className={inputClass} {...register('confirm_password')} />
                {errors.confirm_password && (
                  <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-medium transition-all mt-2"
              style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}
              disabled={isLoading}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta-dark)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta)')}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create Account
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--color-terracotta)' }}>
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FolderKanban, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await login(data)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error?.response?.data?.detail ?? 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #C2754F 0%, #D4936F 40%, #7D8B6A 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 text-white text-center px-12 animate-fade-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-8">
            <FolderKanban className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold font-serif mb-4">ProjectFlow</h1>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Organize your projects, collaborate with your team, and deliver results — all in one place.
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
            <h2 className="text-2xl font-bold font-serif" style={{ color: 'var(--color-coffee)' }}>Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2 animate-slide-up animate-stagger-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl border-[var(--color-sand-dark)] focus:border-[var(--color-terracotta)] focus:ring-[var(--color-terracotta)]"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2 animate-slide-up animate-stagger-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-xl border-[var(--color-sand-dark)] focus:border-[var(--color-terracotta)] focus:ring-[var(--color-terracotta)]"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}
              disabled={isLoading}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta-dark)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta)')}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Sign in
            </Button>

            <p className="text-sm text-muted-foreground text-center animate-slide-up animate-stagger-3">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--color-terracotta)' }}>
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

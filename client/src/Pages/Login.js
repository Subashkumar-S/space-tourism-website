import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../Components/Navbar'
import { useAuth } from '../context/AuthContext'
import { BASE_URL } from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(params.get('error') === 'google' ? 'Google sign-in failed. Please try again.' : '')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const signupHref = returnTo === '/' ? '/signup' : `/signup?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <section className='w-full min-h-screen bg-home-mobile md:bg-home-tablet lg:bg-home-desktop bg-cover bg-no-repeat bg-center'>
      <Navbar />
      <main className='flex justify-center px-6 pt-[8vh] pb-12'>
        <form onSubmit={onSubmit} className='w-full max-w-md bg-[#0b0d17]/60 backdrop-blur-md border border-active-white/20 rounded-lg p-8 text-primary-white'>
          <h1 className='uppercase font-Bellefair text-active-white text-3xl tracking-widest mb-6'>Log in</h1>
          {error && <p className='mb-4 text-red-300 font-Barlow'>{error}</p>}

          <label className='block mb-4 font-Barlow'>
            <span className='block uppercase text-sm tracking-widest mb-1'>Email</span>
            <input type='email' required value={email} onChange={(e) => setEmail(e.target.value)}
              className='w-full bg-transparent border border-active-white/30 rounded px-3 py-2 text-active-white focus:border-active-white outline-none' />
          </label>

          <label className='block mb-6 font-Barlow'>
            <span className='block uppercase text-sm tracking-widest mb-1'>Password</span>
            <input type='password' required value={password} onChange={(e) => setPassword(e.target.value)}
              className='w-full bg-transparent border border-active-white/30 rounded px-3 py-2 text-active-white focus:border-active-white outline-none' />
          </label>

          <button type='submit' disabled={submitting}
            className='w-full uppercase tracking-widest font-Barlow bg-active-white text-primary-black py-3 rounded hover:bg-primary-white transition disabled:opacity-50'>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>

          <div className='flex items-center gap-3 my-5'>
            <span className='h-px flex-1 bg-active-white/20'></span>
            <span className='text-xs uppercase tracking-widest text-primary-white/70'>or</span>
            <span className='h-px flex-1 bg-active-white/20'></span>
          </div>

          <a href={`${BASE_URL}/auth/google`}
            className='block text-center w-full uppercase tracking-widest font-Barlow border border-active-white/40 py-3 rounded hover:border-active-white transition'>
            Continue with Google
          </a>

          <p className='mt-6 text-center font-Barlow text-primary-white/80'>
            No account?{' '}
            <Link to={signupHref} className='text-active-white underline'>Sign up</Link>
          </p>
        </form>
      </main>
    </section>
  )
}

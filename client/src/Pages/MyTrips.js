import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../Components/Navbar'
import { apiGet } from '../api/client'
import destinationImages from '../utils/destinationImages'
import { formatUSD, formatLaunchDate } from '../utils/format'

const STATUS_STYLE = {
  confirmed: 'text-green-300 border-green-300/40',
  pending: 'text-yellow-300 border-yellow-300/40',
  cancelled: 'text-red-300 border-red-300/40',
  refunded: 'text-blue-300 border-blue-300/40',
}

export default function MyTrips() {
  const [trips, setTrips] = useState([])
  const [status, setStatus] = useState('loading') // loading | error | ready
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const banner = params.get('status') // success | cancelled

  useEffect(() => {
    let active = true
    apiGet('/bookings/me')
      .then((d) => { if (active) { setTrips(d); setStatus('ready') } })
      .catch((err) => { if (active) { setError(err.message); setStatus('error') } })
    return () => { active = false }
  }, [])

  return (
    <section className='w-full min-h-screen bg-home-mobile md:bg-home-tablet lg:bg-home-desktop bg-cover bg-no-repeat bg-center'>
      <Navbar />
      <main className='text-primary-white px-6 md:px-16 pb-16'>
        <h1 className='uppercase font-Bellefair text-active-white text-4xl tracking-widest pt-6 mb-6'>My Trips</h1>

        {banner === 'success' && (
          <p className='mb-6 font-Barlow border border-green-300/40 text-green-300 rounded px-4 py-3'>
            Payment received. Your trip confirms within a few seconds once Stripe notifies us — refresh to see it update.
          </p>
        )}
        {banner === 'cancelled' && (
          <p className='mb-6 font-Barlow border border-yellow-300/40 text-yellow-300 rounded px-4 py-3'>
            Checkout cancelled — your held seats have been released.
          </p>
        )}

        {status === 'loading' && <p className='font-Barlow tracking-widest uppercase'>Loading…</p>}
        {status === 'error' && <p className='font-Barlow text-red-300'>{error}</p>}

        {status === 'ready' && trips.length === 0 && (
          <p className='font-Barlow'>
            No trips yet. <Link to='/destination' className='text-active-white underline'>Browse destinations</Link>.
          </p>
        )}

        {status === 'ready' && trips.length > 0 && (
          <div className='flex flex-col gap-4 max-w-3xl'>
            {trips.map((t) => (
              <article key={t.id} className='flex items-center gap-4 border border-active-white/20 rounded-lg p-4 bg-[#0b0d17]/50'>
                {t.destination && (
                  <img src={destinationImages[t.destination.imageKey]} alt={t.destination.name} className='w-16 h-16 object-contain hidden sm:block' />
                )}
                <div className='flex-1'>
                  <div className='flex items-center justify-between gap-3'>
                    <h3 className='uppercase font-Bellefair text-active-white text-xl'>{t.destination?.name || 'Trip'}</h3>
                    <span className={`uppercase text-xs tracking-widest font-Barlow border rounded px-2 py-1 ${STATUS_STYLE[t.status] || 'text-primary-white border-active-white/30'}`}>{t.status}</span>
                  </div>
                  <p className='font-Barlow text-primary-white/80 mt-1'>
                    Departs {t.launch ? formatLaunchDate(t.launch.departAt) : '—'} · {t.seats} seat(s) · {formatUSD(t.amount)}
                  </p>
                  <p className='font-Barlow text-primary-white/60 text-sm mt-1'>
                    Passengers: {t.passengers.join(', ')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </section>
  )
}

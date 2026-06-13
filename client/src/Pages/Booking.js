import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../Components/Navbar'
import { apiGet, apiPost } from '../api/client'
import destinationImages from '../utils/destinationImages'
import { formatUSD, formatLaunchDate } from '../utils/format'

export default function Booking() {
  const { slug } = useParams()
  const [destination, setDestination] = useState(null)
  const [launches, setLaunches] = useState([])
  const [status, setStatus] = useState('loading') // loading | error | ready
  const [error, setError] = useState('')
  const [selectedLaunchId, setSelectedLaunchId] = useState('')
  const [passengers, setPassengers] = useState([''])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      apiGet(`/destinations/${slug}`),
      apiGet(`/destinations/${slug}/launches`),
    ])
      .then(([dest, lns]) => {
        if (!active) return
        setDestination(dest)
        setLaunches(lns)
        if (lns.length) setSelectedLaunchId(lns[0]._id)
        setStatus('ready')
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setStatus('error')
        }
      })
    return () => { active = false }
  }, [slug])

  const selectedLaunch = useMemo(
    () => launches.find((l) => l._id === selectedLaunchId) || null,
    [launches, selectedLaunchId]
  )
  const seatCount = passengers.length
  const total = selectedLaunch ? selectedLaunch.pricePerSeat * seatCount : 0

  const updatePassenger = (i, val) =>
    setPassengers((p) => p.map((x, idx) => (idx === i ? val : x)))
  const addPassenger = () =>
    setPassengers((p) => (p.length < 10 ? [...p, ''] : p))
  const removePassenger = (i) =>
    setPassengers((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    const names = passengers.map((s) => s.trim())
    if (!selectedLaunch) return setSubmitError('Pick a launch date.')
    if (names.some((n) => !n)) return setSubmitError('Enter every passenger name.')
    if (names.length > selectedLaunch.seatsAvailable)
      return setSubmitError(`Only ${selectedLaunch.seatsAvailable} seat(s) left on this launch.`)

    setSubmitting(true)
    try {
      const { url } = await apiPost('/bookings', {
        launchId: selectedLaunch._id,
        passengers: names,
      })
      window.location.href = url // off to Stripe Checkout
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-transparent border border-active-white/30 rounded px-3 py-2 text-active-white focus:border-active-white outline-none'

  return (
    <section className='w-full min-h-screen bg-destination-mobile md:bg-destination-tablet lg:bg-destination-desktop bg-cover bg-no-repeat'>
      <Navbar />
      <main className='text-primary-white px-6 md:px-16 pb-16'>
        {status === 'loading' && (
          <p className='text-center pt-16 font-Barlow tracking-widest uppercase'>Loading…</p>
        )}
        {status === 'error' && (
          <p className='text-center pt-16 font-Barlow tracking-widest uppercase text-red-300'>{error}</p>
        )}

        {status === 'ready' && destination && (
          <div className='max-w-3xl mx-auto pt-6'>
            <h1 className='uppercase font-Bellefair text-active-white text-4xl tracking-widest mb-2'>
              Book {destination.name}
            </h1>
            <p className='font-Barlow mb-6'>{formatUSD(destination.pricePerSeat)} per seat</p>

            {launches.length === 0 ? (
              <p className='font-Barlow'>No upcoming launches for this destination yet.</p>
            ) : (
              <form onSubmit={onSubmit} className='flex flex-col gap-8'>
                <fieldset>
                  <legend className='uppercase tracking-widest font-Barlow text-sm mb-3'>Choose a launch</legend>
                  <div className='flex flex-col gap-3'>
                    {launches.map((l) => (
                      <label key={l._id}
                        className={`flex items-center justify-between gap-4 border rounded px-4 py-3 cursor-pointer font-Barlow ${selectedLaunchId === l._id ? 'border-active-white bg-active-white/10' : 'border-active-white/25 hover:border-active-white/60'}`}>
                        <span className='flex items-center gap-3'>
                          <input type='radio' name='launch' value={l._id} checked={selectedLaunchId === l._id}
                            onChange={() => setSelectedLaunchId(l._id)} />
                          <span className='text-active-white'>{formatLaunchDate(l.departAt)}</span>
                          <span className='text-primary-white/70'>· {l.durationLabel}</span>
                        </span>
                        <span className='text-primary-white/80'>{l.seatsAvailable} seats left</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className='uppercase tracking-widest font-Barlow text-sm mb-3'>Passengers</legend>
                  <div className='flex flex-col gap-3'>
                    {passengers.map((name, i) => (
                      <div key={i} className='flex gap-2'>
                        <input type='text' placeholder={`Passenger ${i + 1} name`} value={name}
                          onChange={(e) => updatePassenger(i, e.target.value)} className={inputClass} />
                        {passengers.length > 1 && (
                          <button type='button' onClick={() => removePassenger(i)}
                            className='px-3 border border-active-white/30 rounded hover:border-active-white' aria-label='Remove passenger'>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {passengers.length < 10 && (
                    <button type='button' onClick={addPassenger}
                      className='mt-3 uppercase text-sm tracking-widest font-Barlow underline'>+ Add passenger</button>
                  )}
                </fieldset>

                <div className='flex items-center justify-between border-t border-active-white/20 pt-4 font-Barlow'>
                  <span className='uppercase tracking-widest'>Total · {seatCount} seat(s)</span>
                  <span className='text-active-white text-2xl font-Bellefair'>{formatUSD(total)}</span>
                </div>

                {submitError && <p className='text-red-300 font-Barlow'>{submitError}</p>}

                <button type='submit' disabled={submitting}
                  className='uppercase tracking-widest font-Barlow bg-active-white text-primary-black py-3 rounded hover:bg-primary-white transition disabled:opacity-50'>
                  {submitting ? 'Redirecting to checkout…' : 'Pay with Stripe'}
                </button>
                <p className='text-xs text-primary-white/60 font-Barlow text-center'>
                  Test mode — use card 4242 4242 4242 4242, any future expiry & CVC.
                </p>
              </form>
            )}
          </div>
        )}
      </main>
    </section>
  )
}

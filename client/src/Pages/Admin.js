import React, { useEffect, useState } from 'react'
import Navbar from '../Components/Navbar'
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client'
import { formatUSD, formatLaunchDate } from '../utils/format'

const TABS = ['stats', 'destinations', 'launches', 'bookings']
const input =
  'bg-transparent border border-active-white/30 rounded px-2 py-1 text-active-white focus:border-active-white outline-none'
const btn =
  'uppercase text-xs tracking-widest font-Barlow border border-active-white/40 rounded px-3 py-1 hover:border-active-white disabled:opacity-50'

function Card({ label, value }) {
  return (
    <div className='border border-active-white/20 rounded-lg p-4 bg-[#0b0d17]/50'>
      <p className='uppercase text-xs tracking-widest text-primary-white/70 font-Barlow'>{label}</p>
      <p className='text-active-white text-2xl font-Bellefair mt-1'>{value}</p>
    </div>
  )
}

function StatsTab() {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    apiGet('/admin/stats').then(setStats).catch((e) => setErr(e.message))
  }, [])
  if (err) return <p className='text-red-300 font-Barlow'>{err}</p>
  if (!stats) return <p className='font-Barlow'>Loading…</p>
  return (
    <div className='flex flex-col gap-6'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card label='Net revenue' value={formatUSD(stats.netRevenueCents)} />
        <Card label='Gross revenue' value={formatUSD(stats.revenueCents)} />
        <Card label='Refunded' value={formatUSD(stats.refundedCents)} />
        <Card label='Seats sold' value={stats.seatsSold} />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='border border-active-white/20 rounded-lg p-4'>
          <h3 className='uppercase tracking-widest font-Barlow text-sm mb-2'>Bookings by status ({stats.totalBookings})</h3>
          {stats.bookingsByStatus.length === 0 ? (
            <p className='text-primary-white/60 font-Barlow'>None yet</p>
          ) : (
            stats.bookingsByStatus.map((s) => (
              <p key={s.status} className='font-Barlow capitalize'>{s.status}: {s.count}</p>
            ))
          )}
        </div>
        <div className='border border-active-white/20 rounded-lg p-4'>
          <h3 className='uppercase tracking-widest font-Barlow text-sm mb-2'>Popular destinations</h3>
          {stats.popularDestinations.length === 0 ? (
            <p className='text-primary-white/60 font-Barlow'>None yet</p>
          ) : (
            stats.popularDestinations.map((d) => (
              <p key={d.name} className='font-Barlow'>{d.name}: {d.bookings} bookings ({d.seats} seats)</p>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DestinationsTab() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const load = () => apiGet('/admin/destinations').then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  const set = (id, field, val) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, [field]: val } : r)))
  const save = async (d) => {
    const dollars = d.priceDollars !== undefined ? Number(d.priceDollars) : d.pricePerSeat / 100
    try {
      await apiPatch(`/admin/destinations/${d._id}`, {
        name: d.name,
        description: d.description,
        imageKey: d.imageKey,
        pricePerSeat: Math.round(dollars * 100),
      })
      alert(`Saved ${d.slug}`)
    } catch (e) {
      alert(e.message)
    }
  }
  if (err) return <p className='text-red-300 font-Barlow'>{err}</p>
  return (
    <div className='flex flex-col gap-4'>
      {rows.map((d) => (
        <div key={d._id} className='border border-active-white/20 rounded-lg p-4 flex flex-col gap-2'>
          <div className='flex flex-wrap gap-2 items-center'>
            <span className='uppercase font-Bellefair text-active-white text-lg w-20'>{d.slug}</span>
            <input className={input} value={d.name} onChange={(e) => set(d._id, 'name', e.target.value)} />
            <input className={`${input} w-24`} type='number' value={d.priceDollars !== undefined ? d.priceDollars : d.pricePerSeat / 100}
              onChange={(e) => set(d._id, 'priceDollars', e.target.value)} title='Price per seat (USD)' />
            <input className={`${input} w-28`} value={d.imageKey} onChange={(e) => set(d._id, 'imageKey', e.target.value)} title='imageKey' />
            <button className={btn} onClick={() => save(d)}>Save</button>
          </div>
          <textarea className={`${input} w-full`} rows={2} value={d.description} onChange={(e) => set(d._id, 'description', e.target.value)} />
        </div>
      ))}
    </div>
  )
}

function LaunchesTab() {
  const [launches, setLaunches] = useState([])
  const [dests, setDests] = useState([])
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ destination: '', departAt: '', durationLabel: '', priceDollars: '', seatsTotal: '' })
  const load = () => {
    apiGet('/admin/launches').then(setLaunches).catch((e) => setErr(e.message))
    apiGet('/admin/destinations').then(setDests).catch(() => {})
  }
  useEffect(() => { load() }, [])
  const patch = async (id, body) => { try { await apiPatch(`/admin/launches/${id}`, body); load() } catch (e) { alert(e.message) } }
  const cancel = async (id) => {
    if (!window.confirm('Cancel this launch and refund its bookings?')) return
    try { await apiDelete(`/admin/launches/${id}`); load() } catch (e) { alert(e.message) }
  }
  const editCapacity = (l) => {
    const booked = l.seatsTotal - l.seatsAvailable
    const v = window.prompt(`New total seats (already booked: ${booked})`, l.seatsTotal)
    if (v == null) return
    patch(l._id, { seatsTotal: Number(v) })
  }
  const create = async (e) => {
    e.preventDefault()
    try {
      await apiPost('/admin/launches', {
        destination: form.destination,
        departAt: new Date(form.departAt).toISOString(),
        durationLabel: form.durationLabel,
        pricePerSeat: Math.round(Number(form.priceDollars) * 100),
        seatsTotal: Number(form.seatsTotal),
      })
      setForm({ destination: '', departAt: '', durationLabel: '', priceDollars: '', seatsTotal: '' })
      load()
    } catch (e2) {
      alert(e2.message)
    }
  }
  if (err) return <p className='text-red-300 font-Barlow'>{err}</p>
  return (
    <div className='flex flex-col gap-6'>
      <form onSubmit={create} className='border border-active-white/20 rounded-lg p-4 flex flex-wrap gap-3 items-end'>
        <label className='flex flex-col text-xs uppercase tracking-widest font-Barlow gap-1'>Destination
          <select className={input} value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} required>
            <option value='' className='text-black'>—</option>
            {dests.map((d) => <option key={d._id} value={d._id} className='text-black'>{d.name}</option>)}
          </select>
        </label>
        <label className='flex flex-col text-xs uppercase tracking-widest font-Barlow gap-1'>Departs
          <input className={input} type='date' value={form.departAt} onChange={(e) => setForm((f) => ({ ...f, departAt: e.target.value }))} required />
        </label>
        <label className='flex flex-col text-xs uppercase tracking-widest font-Barlow gap-1'>Duration
          <input className={input} value={form.durationLabel} placeholder='3 days' onChange={(e) => setForm((f) => ({ ...f, durationLabel: e.target.value }))} required />
        </label>
        <label className='flex flex-col text-xs uppercase tracking-widest font-Barlow gap-1'>Price (USD)
          <input className={`${input} w-28`} type='number' value={form.priceDollars} onChange={(e) => setForm((f) => ({ ...f, priceDollars: e.target.value }))} required />
        </label>
        <label className='flex flex-col text-xs uppercase tracking-widest font-Barlow gap-1'>Seats
          <input className={`${input} w-20`} type='number' value={form.seatsTotal} onChange={(e) => setForm((f) => ({ ...f, seatsTotal: e.target.value }))} required />
        </label>
        <button className={`${btn} bg-active-white text-primary-black`} type='submit'>Create launch</button>
      </form>

      <div className='overflow-x-auto'>
        <table className='w-full text-sm font-Barlow'>
          <thead>
            <tr className='text-left uppercase text-xs tracking-widest text-primary-white/70'>
              <th className='py-2 pr-4'>Departs</th><th className='pr-4'>Destination</th><th className='pr-4'>Seats</th>
              <th className='pr-4'>Price</th><th className='pr-4'>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {launches.map((l) => (
              <tr key={l._id} className='border-t border-active-white/10'>
                <td className='py-2 pr-4'>{formatLaunchDate(l.departAt)}</td>
                <td className='pr-4'>{l.destination?.name || '—'}</td>
                <td className='pr-4'>{l.seatsAvailable}/{l.seatsTotal}</td>
                <td className='pr-4'>{formatUSD(l.pricePerSeat)}</td>
                <td className='pr-4'>
                  <select className={input} value={l.status} onChange={(e) => patch(l._id, { status: e.target.value })}>
                    {['scheduled', 'full', 'departed', 'cancelled'].map((s) => <option key={s} value={s} className='text-black'>{s}</option>)}
                  </select>
                </td>
                <td className='flex gap-2 py-2'>
                  <button className={btn} onClick={() => editCapacity(l)}>Capacity</button>
                  <button className={btn} onClick={() => cancel(l._id)}>Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BookingsTab() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const load = () => apiGet('/admin/bookings').then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])
  const refund = async (id) => {
    if (!window.confirm('Refund/cancel this booking?')) return
    try { await apiPost(`/admin/bookings/${id}/refund`, {}); load() } catch (e) { alert(e.message) }
  }
  if (err) return <p className='text-red-300 font-Barlow'>{err}</p>
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm font-Barlow'>
        <thead>
          <tr className='text-left uppercase text-xs tracking-widest text-primary-white/70'>
            <th className='py-2 pr-4'>User</th><th className='pr-4'>Destination</th><th className='pr-4'>Seats</th>
            <th className='pr-4'>Amount</th><th className='pr-4'>Status</th><th className='pr-4'>Created</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td className='py-3 text-primary-white/60' colSpan={7}>No bookings yet.</td></tr>}
          {rows.map((b) => (
            <tr key={b._id} className='border-t border-active-white/10'>
              <td className='py-2 pr-4'>{b.user?.email || '—'}</td>
              <td className='pr-4'>{b.launch?.destination?.name || '—'}</td>
              <td className='pr-4'>{b.seats}</td>
              <td className='pr-4'>{formatUSD(b.amount)}</td>
              <td className='pr-4 capitalize'>{b.status}</td>
              <td className='pr-4'>{formatLaunchDate(b.createdAt)}</td>
              <td className='py-2'>
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <button className={btn} onClick={() => refund(b._id)}>Refund</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('stats')
  return (
    <section className='w-full min-h-screen bg-[#0b0d17] text-primary-white'>
      <Navbar />
      <main className='px-6 md:px-16 pb-16'>
        <h1 className='uppercase font-Bellefair text-active-white text-4xl tracking-widest pt-6 mb-4'>Admin</h1>
        <div className='flex gap-2 mb-6 flex-wrap'>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`uppercase tracking-widest text-sm font-Barlow px-4 py-2 rounded ${tab === t ? 'bg-active-white text-primary-black' : 'border border-active-white/30 hover:border-active-white'}`}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'stats' && <StatsTab />}
        {tab === 'destinations' && <DestinationsTab />}
        {tab === 'launches' && <LaunchesTab />}
        {tab === 'bookings' && <BookingsTab />}
      </main>
    </section>
  )
}

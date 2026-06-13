import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../Components/Navbar'
import { apiGet } from '../api/client'
import destinationImages from '../utils/destinationImages'
import { formatUSD } from '../utils/format'

const Destination = () => {
    const [destinations, setDestinations] = useState([]);
    const [planetNumber, setPlanetNumber] = useState(0);
    const [status, setStatus] = useState('loading'); // loading | error | ready
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        apiGet('/destinations')
            .then((data) => {
                if (!active) return;
                setDestinations(data);
                setStatus('ready');
            })
            .catch((err) => {
                if (!active) return;
                setError(err.message);
                setStatus('error');
            });
        return () => { active = false; };
    }, []);

    const planet = destinations[planetNumber];

    return (
        <section className='w-full  min-h-screen bg-destination-mobile md:bg-destination-tablet lg:bg-destination-desktop bg-cover bg-no-repeat'>
            <Navbar/>
            <main className='text-primary-white sm:text-center text-start sm:px-4 pb-8 md0:px-16'>
                <h5 className='uppercase lg:pt-[9vh] md:pl-[5vw] md:tracking-widest lg:pl-[7vw] md:text-[4vw] lg:text-[2vw] font-Barlow '>
                    <span className='pr-2'>01</span>
                    <span className='text-active-white'>Pick your destination</span>
                </h5>

                {status === 'loading' && (
                    <p className='text-center pt-16 font-Barlow tracking-widest uppercase'>Loading destinations…</p>
                )}
                {status === 'error' && (
                    <p className='text-center pt-16 font-Barlow tracking-widest uppercase text-red-300'>
                        Couldn’t load destinations: {error}
                    </p>
                )}

                {status === 'ready' && planet && (
                <div className='flex flex-col items-center pt-4 gap-8 px-4 md:text-center lg:flex-row lg:justify-between lg:gap-40 lg:h-[52vh] lg:fixed lg:bottom-[13vh] lg:ml-[16vw] lg:mr-[11vw]'>
                    <div className='w-[45vw] h-[45vw] lg:w-[30vw] lg:h-[30vw]'>
                        <img src={destinationImages[planet.imageKey]} alt={planet.name} />
                    </div>
                    <div className='flex flex-col gap-8 lg:w-[30vw] lg:min-h-[52vh]'>
                        <div className='border-b border-b-solid border-b-active-white border-opacity-50'>
                            <ul className='flex justify-center gap-4 lg:justify-normal lg:gap-8 font-Barlow  md:text-[3vw]'>
                                {destinations.map((d, i) => (
                                    <li key={d.slug}>
                                        <button onClick={() => setPlanetNumber(i)} className={`uppercase ${planetNumber === i ? 'border-b-2 border-b-solid border-active-white text-active-white' : 'hover:border-b-2 hover:border-b-solid hover:border-primary-white hover:border-opacity-50'}`}>{d.name}</button>
                                    </li>
                                ))}
                            </ul>
                            <h3 className='uppercase text-[15vw] font-Bellefair text-active-white lg:text-[7vw] '>{planet.name}</h3>
                            <p className='lg:text-[20px] pb-8 lg:text-base'>
                                {planet.description}
                            </p>
                        </div>
                        <div className='uppercase flex  sm:gap-4 sm:flex-col flex-row gap-16 md:justify-around  '>
                            <div>
                                <h6 className='md:text-[18px]  font-Barlow'>Avg. distance</h6>
                                <h4 className='text-active-white text-[10vw] md:text-[4vw] lg:text-[1.8vw] font-Bellefair'>{planet.distance}</h4>
                            </div>
                            <div>
                                <h6 className='lg:text-[18px] font-Barlow'>Est. travel time</h6>
                                <h4 className='text-active-white text-[10vw] md:text-[4vw] lg:text-[1.8vw] font-Bellefair'>{planet.travel}</h4>
                            </div>
                        </div>
                        <Link to={`/book/${planet.slug}`} className='uppercase tracking-widest font-Barlow text-center bg-active-white text-primary-black py-3 px-6 rounded hover:bg-primary-white transition'>
                            Book this trip — {formatUSD(planet.pricePerSeat)}/seat
                        </Link>
                    </div>
                </div>
                )}
            </main>
        </section>
    )
}
export default Destination;

import React, {useState} from 'react'
import Navbar from '../Components/Navbar'
import moon from '../assets/destination/image-moon.png'
import mars from '../assets/destination/image-mars.png'
import europa from '../assets/destination/image-europa.png'
import titan from '../assets/destination/image-titan.png'
import data from '../Components/data'
const Destination = (props) => {
    const [planetNumber, setPlanetNumber] = useState(0);
    let planetImages= [
        moon,
        mars,
        europa,
        titan
    ]
    return (
        <section className='w-full  min-h-screen bg-destination-mobile md:bg-destination-tablet lg:bg-destination-desktop bg-cover bg-no-repeat'>
            <Navbar/>
            <main className='text-primary-white sm:text-center sm:px-4 pb-8 '>
                <h5 className='uppercase lg:pt-[9vh] md:pl-[5vw] md:tracking-widest lg:pl-[11.5vw] md:text-[4vw] lg:text-[2vw] font-Barlow'>
                    <span className='pr-2'>01</span>
                    <span className='text-active-white'>Pick your destination</span>
                </h5>
                <div className='flex flex-col items-center pt-4 gap-8 px-4 md:mx-[10vw] md:text-center lg:flex-row lg:justify-between lg:gap-40 lg:h-[52vh] lg:fixed lg:bottom-[13vh] lg:ml-[16vw] lg:mr-[11vw] '>
                    <div className='w-[45vw] h-[45vw] lg:w-[30vw] lg:h-[30vw]'>
                        <img src={planetImages[planetNumber]} alt='Moon' />
                    </div>
                    <div className='flex flex-col gap-8 lg:w-[30vw] lg:min-h-[52vh]'>
                        <div className='border-b border-b-solid border-b-active-white'>
                            <ul className='flex justify-center gap-4 lg:justify-normal lg:gap-8 font-Barlow  md:text-[3vw]'>
                                <li>
                                    <button onClick={() => setPlanetNumber(0)} className='uppercase border-b-2 border-b-solid border-primary-white '>Moon</button>
                                </li>
                                <li>
                                    <button onClick={() => setPlanetNumber(1)} className='uppercase'>Mars</button>
                                </li>
                                <li>
                                    <button onClick={() => setPlanetNumber(2)} className='uppercase '>Europa</button>
                                </li>
                                <li>
                                    <button onClick={() => setPlanetNumber(3)} className='uppercase '>Titan</button>
                                </li>
                            </ul>
                            <h3 className='uppercase text-[15vw] font-Bellefair text-active-white lg:text-[7vw] '>{data.destinations[planetNumber].name}</h3>
                            <p className='lg:text-[20px] pb-8 lg:text-base'>
                                {data.destinations[planetNumber].description}
                            </p>
                        </div>
                        <div className='uppercase flex  sm:gap-4 sm:flex-col flex-row gap-16 md:justify-around  '>
                            <div>
                                <h6 className='md:text-[18px]  font-Barlow'>Avg. distance</h6>
                                <h4 className='text-active-white text-[10vw] md:text-[4vw] lg:text-[1.8vw] font-Bellefair'>{data.destinations[planetNumber].distance}</h4>
                            </div>
                            <div>
                                <h6 className='lg:text-[18px] font-Barlow'>Est. travel time</h6>
                                <h4 className='text-active-white text-[10vw] md:text-[4vw] lg:text-[1.8vw] font-Bellefair'>{data.destinations[planetNumber].travel}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </section>
    )
}
export default Destination;
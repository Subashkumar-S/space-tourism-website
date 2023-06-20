import React, {useState} from 'react'
import Navbar from '../Components/Navbar'
import Douglas from '../assets/crew/image-douglas-hurley.png'
import Mark from '../assets/crew/image-mark-shuttleworth.png'
import Victor from '../assets/crew/image-victor-glover.png'
import Anousheh from '../assets/crew/image-anousheh-ansari.png'
import data from '../Components/data'

const Crew = () => {
    const [crewNumber, setCrewNumber] = useState(0)
    let crewImages = [
        Douglas,
        Mark,
        Victor,
        Anousheh
    ]
    return (
        <section className='w-full min-h-screen bg-crew-desktop text-primary-white bg-cover md:bg-crew-tablet sm:bg-crew-mobile px-4 '>
            <Navbar/>
            <main className='md0:w-[80%] m-auto text-center '>
                <h5 className='font-Barlow tracking-widest text-active-white uppercase text-xl pb-8 md0:text-start lg:pl-[10vw] lg:text-[2vw] lg:pt-[10vh]'>
                    <span className='text-primary-white pr-2'>02</span>
                    Meet your crew
                </h5>
                <div className='flex flex-col gap-10 md0:flex-col-reverse lg:flex-row-reverse lg:h-[70vh] lg:items-center lg:gap-16 lg:pl-[10vw] lg:fixed lg:bottom-0'>
                    <div className='w-full  flex flex-col  justify-center items-center'>
                        <img src={crewImages[crewNumber]} alt='Victor' className='h-[31vh] w-[50vw] md:h-full lg:h-[80vh]'/>
                    </div>
                    <div className='flex sm:flex-col flex-col-reverse lg:gap-20 md:gap-8 lg:text-start lg:justify-around lg:h-full' >
                        <div className='flex justify-center gap-4 pb-4 lg:justify-start'>
                            <button onClick={() => setCrewNumber(0)} className={`w-4 aspect-square rounded-full bg-[#545353]  ${crewNumber === 0 ? 'bg-active-white' : 'hover:bg-active-white hover:bg-opacity-50'}`}></button>
                            <button onClick={() => setCrewNumber(1)} className={`w-4 aspect-square rounded-full bg-[#545353] ${crewNumber === 1 ? 'bg-active-white' : 'hover:bg-active-white hover:bg-opacity-50'}`}></button>
                            <button onClick={() => setCrewNumber(2)} className={`w-4 aspect-square rounded-full bg-[#545353] ${crewNumber === 2 ? 'bg-active-white' : 'hover:bg-active-white hover:bg-opacity-50'}`}></button>
                            <button onClick={() => setCrewNumber(3)} className={`w-4 aspect-square rounded-full bg-[#545353] ${crewNumber === 3 ? 'bg-active-white' : 'hover:bg-active-white hover:bg-opacity-50'}`}></button>
                        </div>
                        <div className='flex flex-col justify-between gap-4 lg:gap-8 lg:justify-center lg:w-[40vw] '>
                            <h5 className='uppercase font-Bellefair lg:text-[2vw]'>{data.crew[crewNumber].role}</h5>
                            <h3 className='uppercase text-4xl font-Bellefair text-active-white lg:text-[3.5vw]'>{data.crew[crewNumber].name}</h3>
                            <p className='text-base'>
                                {data.crew[crewNumber].bio}
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </section>
    );
}
export default Crew;
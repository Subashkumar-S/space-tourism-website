import React, {useState} from 'react'
import data from '../Components/data'
import Navbar from '../Components/Navbar'
import vehicle from '../assets/technology/image-launch-vehicle-portrait.jpg'
import spaceport from '../assets/technology/image-spaceport-portrait.jpg'
import capsule from '../assets/technology/image-space-capsule-portrait.jpg'

const Technology = () => {
    const [technologyIndex, setTechnologyIndex] = useState(2);
    let technologyImages = [
        vehicle,
        spaceport,
        capsule
    ]
    return (
        <section className='w-full min-h-screen bg-technology-desktop text-primary-white bg-cover md:text-center md:bg-technology-tablet sm:bg-technology-mobile'>
            <Navbar/>
            <main className=''>
                <h5 className='font-Barlow tracking-widest text-active-white uppercase text-xl pb-8 lg:pl-[11.5vw] lg:text-[2vw] lg:pt-[10vh]'>
                    <span className='text-primary-white pr-2'>02</span>
                    Space launch 101
                </h5>
                <div className='flex flex-col gap-10 lg:flex-row-reverse lg:fixed lg:h-[60vh] lg:bottom-[11vh] lg:ml-[11.5vw] lg:gap-[15vw]'>
                    <div className='w-full flex flex-col  justify-center items-center lg:w-1/2 lg:bg-'>
                        <img src={technologyImages[technologyIndex]} alt={data.technology[technologyIndex].name}  className='h-[31vh] w-full lg:h-[59vh]' />
                    </div>
                    <div className='px-4 lg:flex gap-8 lg:w-1/2'>
                        <div className='flex justify-center gap-4 pb-4 font-Bellefair text-[18px] font-black text-active-white lg:flex-col'>
                            <button onClick={() => setTechnologyIndex(0)} className='w-8 aspect-square rounded-full bg-primary-black border-[1px] border-solid border-primary-white lg:w-10'>1</button>
                            <button onClick={() => setTechnologyIndex(1)} className='w-8 aspect-square rounded-full bg-primary-black border-[1px] border-solid border-primary-white lg:w-10'>2</button>
                            <button onClick={() => setTechnologyIndex(2)} className='w-8 aspect-square rounded-full bg-primary-black border-[1px] border-solid border-primary-white lg:w-10'>3</button>
                        </div>
                        <div className='flex flex-col justify-between gap-4 lg:justify-center '>
                            <h5 className='uppercase font-Bellefair'>the terminology...</h5>
                            <h3 className='uppercase text-4xl font-Bellefair text-active-white'>{data.technology[technologyIndex].name}</h3>
                            <p className=''>
                                {data.technology[technologyIndex].description}
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </section>
    );
}
export default Technology;
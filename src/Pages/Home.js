import React from 'react'
import {Link} from 'react-router-dom'
import Navbar from "../Components/Navbar";

const Home = (props) =>{
    return (
        <section className='w-full h-screen bg-home-desktop sm:bg-home-mobile md:bg-home-tablet bg-no-repeat bg-cover'>
            <Navbar></Navbar>
            <main className='w-full h-[80vh] md:text-center text-active-white flex flex-col place-items-center font-Barlow fixed md:top-[19vh] sm:top-[10vh] sm:px-4 lg:flex-row lg:w-[78vw] lg:h-[60vh] justify-around lg:justify-between lg:content-end lg:place-content-around lg:place-items-end lg:bottom-[14vh] lg:mx-[11vw]'>
                <div className='flex flex-col justify-between gap-4 md:gap-2 lg:w-1/2 lg:gap- lg:justify-items-start '>
                    <h5 className='text-2xl uppercase text-primary-white'>So you want to travel to</h5>
                    <h1 className='text-[20vw] uppercase font-Bellefair lg:text-[10vw]'>Space</h1>
                    <p className='text-[18px] text-primary-white '>Let’s face it; if you want to go to space,
                        you might as well genuinely go to outer space and not hover kind of on the edge of it.
                        Well sit back, and relax because we’ll give you a truly out of this world experience!
                    </p>
                </div>
                <Link to='/destination' className='uppercase text-[5vw] font-Bellefair lg:text-[3vw] text-[#0B0D17] sm:w-[40vw] sm:h-[40vw] md:w-[30vw] md:h-[30vw] w-[20vw] h-[20vw]  grid justify-center place-items-center bg-active-white rounded-full relative group -z-10'>
                    <div className='grid place-items-center text-center   w-full h-full rounded-full bg-white bg-opacity-35 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2  group-hover:scale-150 transition-transform z-10 opacity-30'></div>
                    Explore
                </Link>
            </main>
        </section>
    );
}
export default Home;
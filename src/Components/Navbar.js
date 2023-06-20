import React, { useState } from 'react'
import {Link} from 'react-router-dom'
import {ReactComponent as Logo} from '/home/subashkumar/Subash/Projects/Frontend_Mentor_Challenges/space-tourism/src/assets/shared/logo.svg'
import {ReactComponent as Hamburger} from '/home/subashkumar/Subash/Projects/Frontend_Mentor_Challenges/space-tourism/src/assets/shared/icon-hamburger.svg'
import {ReactComponent as Close} from '/home/subashkumar/Subash/Projects/Frontend_Mentor_Challenges/space-tourism/src/assets/shared/icon-close.svg'

function Navbar(){
    const[toggle, setToggle] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleToggle = () => {
        setToggle(!toggle);
    }
    return (
        <header>
            <nav className='flex items-center justify-between pt-7 md:pt-0 h-24 flex-auto font-Barlow text-xl '>
                <a href='./'>
                    <Logo className='ml-7 w-12 aspect-auto'/>
                </a>
                <button className='w-6 hidden md1:block md1:absolute top-8 right-6 z-40' onClick={handleToggle}>
                    {toggle ? <Close /> :<Hamburger/> }
                </button>
                <ul className={`w-[57%] flex justify-around text-white md1:block md1:fixed md1:top-0 ${toggle ? 'md1:right-0' : 'md1:right-[-100vw]'} md1:w-[68%] md1:h-screen md1:px-8 bg-[#ffffff14] backdrop-blur-lg duration-500 z-20`}>
                    <li>
                        <Link to="/" onClick={()=> {setActiveIndex(0)}} className={`border-b-2 hover:border-white py-7 inline-block ${activeIndex === 0 ? 'border-b-active-white' : ' border-transparent' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>00</span>
                            HOME
                        </Link>
                    </li>
                    <li>
                        <Link to="/destination" onClick={()=> {setActiveIndex(1)}} className={`border-b-2 hover:border-white py-7 inline-block ${activeIndex === 1 ? 'border-b-active-white' : ' border-transparent' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>01</span>
                            DESTINATION
                        </Link>
                    </li>
                    <li>
                        <Link to="/crew" onClick={()=> {setActiveIndex(2)}}  className={`border-b-2 hover:border-white py-7 inline-block ${activeIndex === 2 ? 'border-b-active-white' : ' border-transparent' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>02</span>
                            CREW
                        </Link>
                    </li>
                    <li>
                        <Link to="/technology" onClick={()=> {setActiveIndex(3)}}  className={`border-b-2  hover:border-white py-7 inline-block ${activeIndex === 3 ? 'border-b-active-white' : ' border-transparent' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>03</span>
                            TECHNOLOGY
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}
export default Navbar;
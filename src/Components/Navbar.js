import React, { useState } from 'react'
import {Link} from 'react-router-dom'
import {ReactComponent as Logo} from '/home/subashkumar/Subash/Projects/Frontend_Mentor_Challenges/space-tourism/src/assets/shared/logo.svg'
import {ReactComponent as Hamburger} from '/home/subashkumar/Subash/Projects/Frontend_Mentor_Challenges/space-tourism/src/assets/shared/icon-hamburger.svg'
import {ReactComponent as Close} from '/home/subashkumar/Subash/Projects/Frontend_Mentor_Challenges/space-tourism/src/assets/shared/icon-close.svg'

function Navbar(){
    const[toggle, setToggle] = useState(false);
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
                        <Link to="/index.html" className='border-b-2 border-transparent hover:border-white py-7 inline-block'>
                            <span className='pr-[1vw] font-bold md:hidden'>00</span>
                            HOME
                        </Link>
                    </li>
                    <li>
                        <Link to="/destination" className=' border-b-2 border-transparent hover:border-white py-7 inline-block'>
                            <span className='pr-[1vw] font-bold md:hidden'>01</span>
                            DESTINATION
                        </Link>
                    </li>
                    <li>
                        <Link to="/crew" className=' border-b-2 border-transparent hover:border-white py-7 inline-block'>
                            <span className='pr-[1vw] font-bold md:hidden'>02</span>
                            CREW
                        </Link>
                    </li>
                    <li>
                        <Link to="/technology" className=' border-b-2 border-transparent hover:border-white py-7 inline-block'>
                            <span className='pr-[1vw] font-bold md:hidden'>03</span>
                            TECHNOLOGY
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}
export default Navbar;
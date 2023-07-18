import React, { useState } from 'react'
import {Link, useLocation} from 'react-router-dom'
import {ReactComponent as Logo} from '../assets/shared/logo.svg'
import {ReactComponent as Hamburger} from '../assets/shared/icon-hamburger.svg'
import {ReactComponent as Close} from '../assets/shared/icon-close.svg'

function Navbar(){
    const[toggle, setToggle] = useState(false);
    const location = useLocation();
    const handleToggle = () => {
        setToggle(!toggle);
    }
    return (
        <header>
            <nav className='flex items-center justify-between pt-7 md:pt-0 h-24 flex-auto font-Barlow text-xl '>
                <a href='./'>
                    <Logo className='ml-7 w-12 aspect-auto'/>
                </a>
                <div className='border-solid border-[1px] border-amber-50 border-opacity-50 md0:w-[40%] md0:ml-8 md0:-mr-[1vw] z-50  md:border-none'></div>
                <button className='w-6 hidden md1:block md1:absolute top-8 right-6 z-40' onClick={handleToggle}>
                    {toggle ? <Close /> :<Hamburger/> }
                </button>
                <ul className={`w-[57%] flex justify-around text-white md1:block md1:fixed md1:top-0 ${toggle ? 'md1:right-0' : 'md1:right-[-100vw]'} md1:w-[68%] md1:h-screen md1:py-[17vh] md1:px-8 bg-[#ffffff14] backdrop-blur-lg duration-500 z-20`}>
                    <li>
                        <Link to="/"   className={`border-b-2 hover:border-white   py-7 inline-block ${location.pathname === '/' ? 'border-b-active-white' : ' border-transparent hover:border-opacity-50 ' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>00</span>
                            HOME
                        </Link>
                    </li>
                    <li>
                        <Link to="/destination" className={`border-b-2 hover:border-white  py-7 inline-block ${location.pathname === '/destination'  ? 'border-b-active-white' : ' border-transparent hover:border-opacity-50 ' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>01</span>
                            DESTINATION
                        </Link>
                    </li>
                    <li>
                        <Link to="/crew"   className={`border-b-2 hover:border-white py-7 inline-block ${location.pathname === '/crew'  ? 'border-b-active-white' : ' border-transparent hover:border-opacity-50 ' }`}>
                            <span className='pr-[1vw] font-bold md0:hidden lg:inline-block'>02</span>
                            CREW
                        </Link>
                    </li>
                    <li>
                        <Link to="/technology"   className={`border-b-2  hover:border-white   py-7 inline-block ${location.pathname === '/technology'  ? 'border-b-active-white' : ' border-transparent hover:border-opacity-50' }`}>
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
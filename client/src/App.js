import React from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Home from './Pages/Home'
import Destination from "./Pages/Destination";
import Crew from './Pages/Crew'
import Technology from "./Pages/Technology";
const App = () =>{
    return (
        <Router>
            <Routes>
                <Route exact path='/' element={<Home />}></Route>
                <Route path='/destination' element={<Destination/>}></Route>
                <Route path='/crew' element={<Crew/>}></Route>
                <Route path='/technology' element={<Technology/>}></Route>
            </Routes>
        </Router>
    );
}
export default App;
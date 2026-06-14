import React from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Home from './Pages/Home'
import Destination from "./Pages/Destination";
import Crew from './Pages/Crew'
import Technology from "./Pages/Technology";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Booking from "./Pages/Booking";
import Account from "./Pages/Account";
import Admin from "./Pages/Admin";
import ProtectedRoute from "./Components/ProtectedRoute";
import AdminRoute from "./Components/AdminRoute";
import { AuthProvider } from "./context/AuthContext";

const App = () =>{
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path='/' element={<Home />}></Route>
                    <Route path='/destination' element={<Destination/>}></Route>
                    <Route path='/crew' element={<Crew/>}></Route>
                    <Route path='/technology' element={<Technology/>}></Route>
                    <Route path='/login' element={<Login/>}></Route>
                    <Route path='/signup' element={<Signup/>}></Route>
                    <Route path='/book/:slug' element={<ProtectedRoute><Booking/></ProtectedRoute>}></Route>
                    <Route path='/account' element={<ProtectedRoute><Account/></ProtectedRoute>}></Route>
                    {/* Legacy path kept for Stripe success/cancel redirects */}
                    <Route path='/my-trips' element={<ProtectedRoute><Account/></ProtectedRoute>}></Route>
                    <Route path='/admin' element={<AdminRoute><Admin/></AdminRoute>}></Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}
export default App;

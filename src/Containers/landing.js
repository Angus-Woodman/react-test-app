import React from 'react';
import { NavLink } from 'react-router-dom';

const Landing = () => (
    <>
        <h1>Test site</h1>
        <nav>
            <NavLink to="/cooking">Cooking</NavLink>
            <NavLink to="/washersDryers">Washers and dryers</NavLink>
        </nav>
    </>
)

export default Landing;
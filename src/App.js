import React from "react";
import "./styles/App.css";
import { Routes, Route } from 'react-router-dom';
import {Landing, Cooking, WashersDryers} from "./Containers"


class App extends React.Component {
  state = {};
  render() {
    return (
      <>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="cooking" element={<Cooking />} />
          <Route path="washersDryers" element={<WashersDryers />} />
        </Routes>
      </>
    );
  }
}
export default App;

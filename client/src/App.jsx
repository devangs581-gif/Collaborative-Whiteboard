// Top-level client routing for the room join screen and whiteboard.
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RoomJoin from "./components/RoomJoin";
import Whiteboard from "./components/Whiteboard";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoomJoin />} />
        <Route path="/room/:roomId" element={<Whiteboard />} />
      </Routes>
    </Router>
  );
};

export default App;

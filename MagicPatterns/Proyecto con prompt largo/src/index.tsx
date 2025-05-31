import React from 'react';
import './index.css';
import { render } from 'react-dom';
import { App } from './App';
// Import leaflet CSS for maps
import 'leaflet/dist/leaflet.css';
render(<App />, document.getElementById('root'));
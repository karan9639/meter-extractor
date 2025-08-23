import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ScanProvider } from "./state/scanStore.jsx";
import Capture from "./pages/Capture.jsx";
import Result from "./pages/Result.jsx";

function App() {
  return (
    <ScanProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Capture />} />
            <Route path="/result" element={<Result />} />
          </Routes>
        </div>
      </Router>
    </ScanProvider>
  );
}

export default App;

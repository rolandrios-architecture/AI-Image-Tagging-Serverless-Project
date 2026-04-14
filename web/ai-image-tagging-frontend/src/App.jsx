import { useState } from "react";
import Home from "./pages/Home.jsx";


function App() {
  const [status, setStatus] = useState("IDLE");
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);

  return (
    <div>
      <Home
        status={status}
        setStatus={setStatus}
        image={image}
        setImage={setImage}
        result={result}
        setResult={setResult}
      />
    </div>
  );
}

export default App;
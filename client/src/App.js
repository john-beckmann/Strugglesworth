import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function App() {
    return (
        <BrowserRouter>
            {" "}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/callback" element={<Callback />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

function Dashboard() {
    return (
        <div>
            <h1>Welcome to your Dashboard</h1>
        </div>
    );
}

function Home() {
    return (
        <div>
            <h1>Welcome to Strugglesworth</h1>
            <button
                onClick={() => {
                    window.location.href =
                        process.env.REACT_APP_API_URL + "/login";
                }}
            >
                Login with Spotify
            </button>
        </div>
    );
}

function Callback() {
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");

        axios
            .post(
                process.env.REACT_APP_API_URL + "/callback",
                { code, state },
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )
            .then((response) => {
                console.log(response);
                if (response.data.access_token) {
                    navigate("/dashboard");
                }
            })
            .catch((error) => console.error(error));
    });

    return <div>Loading...</div>;
}

export default App;

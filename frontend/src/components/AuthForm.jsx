import React, { useState, useEffect } from "react";
import { postData } from "../utils/api"; 

const AuthForm = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

  
    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegister ? "register" : "login"; 
        const response = await postData(`auth/${endpoint}`, { email, password });
        if (response.success) {
            if(endpoint == 'login'){
                localStorage.setItem("authToken", response.token); 
                onLoginSuccess(response.token);
            } else {
                window.location.reload(); 
            }
        } else {
            setError(response.data.error || "Authentication failed");
        }      
        setLoading(false);
    };

    return (
        <div style={styles.overlay}>

        <div style={styles.container}>
            <h2>Authentication</h2>

            {error && <p style={styles.error}>{error}</p>}

            <form onSubmit={handleSubmit} style={styles.form}>
                <input 
                    type="email" 
                    placeholder="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    style={styles.input} 
                />

                <input 
                    type="password" 
                    placeholder="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    style={styles.input} 
                />

                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? "Loading..." : isRegister ? "SignUp" : "LogIn"}
                </button>
            </form>

            <p style={styles.toggleText} onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? "Do you have the profile? Log in" : "No account? SignUp"}
            </p>
        </div>
    </div>
    );
};

// Стилизация
const styles = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)", // Затемнение фона
    },
    container: {
        width: "320px",
        padding: "20px",
        textAlign: "center",
        backgroundColor: "#1a1a1a",
        color: "white",
        borderRadius: "8px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    input: {
        padding: "1vw",
        fontSize: "16px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        outline: "none",
    },
    button: {
        padding: "10px",
        fontSize: "16px",
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
    },
    error: {
        color: "red",
        fontSize: "14px",
    },
    toggleText: {
        color: "#bbb",
        cursor: "pointer",
        marginTop: "2vw",
    },
};

export default AuthForm;

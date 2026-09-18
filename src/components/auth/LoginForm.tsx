import { useState } from "react";
import type { FormEventHandler } from "react";
import type { LoginCredentials } from "../../types/auth";

interface LoginFormProps {
  error?: string;
  onSubmit: (credentials: LoginCredentials) => void;
  onRegister: () => void;
}

function LoginForm({ error, onSubmit, onRegister }: LoginFormProps) {
  const [carnet, setCarnet] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const normalizedCarnet = carnet.trim();
    if (!normalizedCarnet || !password) return;
    onSubmit({ carnet: normalizedCarnet, password });
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="brand-mark">₿</div>
      <span className="eyebrow">BANCO DE PRÉSTAMOS</span>
      <h1>Iniciar sesión</h1>
      <p className="auth-subtitle">Ingresa para administrar tus préstamos de forma sencilla.</p>

      <div className="field">
        <label htmlFor="carnet">Carnet de identidad</label>
        <input
          id="carnet"
          name="carnet"
          type="text"
          value={carnet}
          onChange={(event) => setCarnet(event.target.value)}
          placeholder="Ej. 7654321"
          autoComplete="username"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="primary-button full" type="submit">Iniciar sesión</button>

      <div className="auth-divider"><span>¿Primera vez?</span></div>
      <button className="secondary-button full" type="button" onClick={onRegister}>
        Crear una cuenta
      </button>

      <p className="demo-note">Demo: CI <strong>7654321</strong> · contraseña <strong>usuario123</strong></p>
    </form>
  );
}

export default LoginForm;

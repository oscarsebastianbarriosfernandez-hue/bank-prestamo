import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authRepository } from "../repositories/authRepository";
import type { Loan } from "../types/auth";

type Section = "inicio" | "solicitar" | "estado" | "historial" | "perfil";

const money = (value: number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(value);

const date = (value: string) =>
  new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(value));

function HomePage() {
  const navigate = useNavigate();
  const user = authRepository.getCurrentUser();
  const [section, setSection] = useState<Section>("inicio");
  const [refresh, setRefresh] = useState(0);
  const [amount, setAmount] = useState(5000);
  const [months, setMonths] = useState(12);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [selectedLoan, setSelectedLoan] = useState("");
  const [message, setMessage] = useState("");

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const loans = useMemo(() => authRepository.getLoans(user.id), [user.id, refresh]);
  const payments = useMemo(() => authRepository.getPayments(user.id), [user.id, refresh]);
  const client = authRepository.getClient(user.id);
  const available = authRepository.getAvailableCredit(user.id);
  const activeLoans = loans.filter((loan) => loan.estado === "ACTIVO");
  const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.saldo, 0);

  const simulationTotal = amount * (1 + 0.12 * (months / 12));
  const monthly = simulationTotal / months;

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  };

  const handleLogout = () => {
    authRepository.logout();
    navigate("/login", { replace: true });
  };

  const requestLoan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const loan = authRepository.createLoan(user.id, amount, months);
    if (!loan) {
      showMessage("No se pudo solicitar el préstamo. Revisa el monto disponible.");
      return;
    }
    showMessage("¡Préstamo solicitado correctamente!");
    setRefresh((value) => value + 1);
    setSection("estado");
  };

  const pay = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const loan = loans.find((item) => item.id_prestamo === selectedLoan);
    const value = Number(paymentAmount);

    if (!loan || !value || value <= 0 || value > loan.saldo) {
      showMessage("Ingresa un monto válido para la cuota seleccionada.");
      return;
    }

    const result = authRepository.payLoan(user.id, loan.id_prestamo, value, paymentMethod);
    if (!result) {
      showMessage("No se pudo registrar el pago.");
      return;
    }

    setPaymentAmount("");
    showMessage("Pago registrado correctamente.");
    setRefresh((current) => current + 1);
  };

  const go = (target: Section) => {
    setSection(target);
    setMessage("");
  };

  const sectionTitle = {
    inicio: "Resumen de tu cuenta",
    solicitar: "Solicitar préstamo",
    estado: "Estado de préstamos",
    historial: "Historial de préstamos",
    perfil: "Mi perfil",
  }[section];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="logo-button" onClick={() => go("inicio")} type="button">
          <span className="logo-icon">₿</span>
          <span><strong>Banco Verde</strong><small>Préstamos</small></span>
        </button>

        <nav className="top-nav">
          <button className={section === "inicio" ? "nav-active" : ""} onClick={() => go("inicio")} type="button">Inicio</button>
          <button className={section === "estado" ? "nav-active" : ""} onClick={() => go("estado")} type="button">Mis préstamos</button>
          <button className={section === "historial" ? "nav-active" : ""} onClick={() => go("historial")} type="button">Historial</button>
        </nav>

        <div className="user-menu">
          <button type="button" className="profile-button" onClick={() => go("perfil")}>
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span>{user.name.split(" ")[0]}</span>
          </button>
          <button className="logout-button" type="button" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="welcome">
          <div>
            <span className="eyebrow">PANEL DEL CLIENTE</span>
            <h1>{sectionTitle}</h1>
            <p>Hola, {user.name.split(" ")[0]}. Gestiona tus préstamos desde un solo lugar.</p>
          </div>
          <div className="balance-card">
            <span>Crédito disponible</span>
            <strong>{money(available)}</strong>
            <small>Límite de demostración: Bs 20.000</small>
          </div>
        </section>

        {message && <div className="toast">{message}</div>}

        {section === "inicio" && (
          <>
            <section className="stats-grid">
              <div className="stat-card"><span>Préstamos activos</span><strong>{activeLoans.length}</strong><small>Operaciones vigentes</small></div>
              <div className="stat-card"><span>Deuda actual</span><strong>{money(totalDebt)}</strong><small>Saldo pendiente</small></div>
              <div className="stat-card"><span>Pagos realizados</span><strong>{payments.length}</strong><small>Registrados en el sistema</small></div>
            </section>

            <section className="action-grid">
              <button className="action-card green-card" onClick={() => go("solicitar")} type="button"><span>＋</span><strong>Solicitar préstamo</strong><small>Simula y registra una nueva solicitud</small></button>
              <button className="action-card" onClick={() => go("estado")} type="button"><span>⌕</span><strong>Consultar estado</strong><small>Revisa saldos y préstamos activos</small></button>
              <button className="action-card" onClick={() => go("estado")} type="button"><span>▣</span><strong>Pagar cuotas</strong><small>Registra un pago de demostración</small></button>
              <button className="action-card" onClick={() => go("historial")} type="button"><span>▤</span><strong>Historial</strong><small>Consulta tus operaciones anteriores</small></button>
            </section>

            <section className="info-panel">
              <div><span className="mini-icon">✓</span><div><strong>Sistema académico de prueba</strong><p>La información se almacena en localStorage como una base de datos simulada para el proyecto.</p></div></div>
              <button className="outline-button" onClick={() => go("perfil")} type="button">Ver perfil</button>
            </section>
          </>
        )}

        {section === "solicitar" && (
          <section className="content-grid">
            <form className="panel loan-form" onSubmit={requestLoan}>
              <div className="panel-heading"><div><span className="eyebrow">NUEVA OPERACIÓN</span><h2>Solicitud de préstamo</h2></div><span className="panel-icon">₿</span></div>
              <p className="muted">Elige un monto y plazo para generar una operación de prueba.</p>

              <div className="field"><label htmlFor="amount">Monto solicitado: {money(amount)}</label><input id="amount" type="range" min="500" max={Math.max(500, available)} step="500" value={amount} onChange={e => setAmount(Number(e.target.value))} /><div className="range-labels"><span>Bs 500</span><span>Bs {Math.round(available).toLocaleString("es-BO")}</span></div></div>

              <div className="field"><label htmlFor="months">Plazo</label><select id="months" value={months} onChange={e => setMonths(Number(e.target.value))}><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={18}>18 meses</option><option value={24}>24 meses</option></select></div>

              <div className="loan-summary"><div><span>Monto</span><strong>{money(amount)}</strong></div><div><span>Interés demo</span><strong>12% anual</strong></div><div><span>Cuota estimada</span><strong>{money(monthly)}</strong></div><div><span>Total estimado</span><strong>{money(simulationTotal)}</strong></div></div>

              <button className="primary-button full" type="submit" disabled={amount > available || available <= 0}>Solicitar préstamo</button>
              <small className="legal-note">Valores únicamente demostrativos para el proyecto académico.</small>
            </form>

            <aside className="side-panel">
              <div className="side-illustration">💳</div>
              <h3>¿Cómo funciona?</h3>
              <ol><li>Selecciona monto y plazo.</li><li>Revisa la cuota estimada.</li><li>Registra la solicitud.</li><li>Consulta y paga desde tu panel.</li></ol>
            </aside>
          </section>
        )}

        {section === "estado" && (
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow">SEGUIMIENTO</span><h2>Mis préstamos</h2></div><span className="count-pill">{loans.length} registros</span></div>
            {loans.length === 0 ? <div className="empty-state"><span>◌</span><h3>Aún no tienes préstamos</h3><p>Solicita tu primer préstamo de prueba para verlo aquí.</p><button className="primary-button" onClick={() => go("solicitar")} type="button">Solicitar préstamo</button></div> : (
              <div className="loan-list">
                {loans.map((loan) => (
                  <article className="loan-row" key={loan.id_prestamo}>
                    <div className="loan-main"><span className="loan-number">#{loan.id_prestamo.slice(-6).toUpperCase()}</span><h3>{money(loan.monto)}</h3><p>{loan.plazo_meses} meses · {loan.interes}% anual · {date(loan.fecha_prestamo)}</p></div>
                    <div className="loan-balance"><span>Saldo</span><strong>{money(loan.saldo)}</strong><em className={loan.estado === "PAGADO" ? "status paid" : "status"}>{loan.estado}</em></div>
                    {loan.estado === "ACTIVO" && <button className="outline-button" onClick={() => { setSelectedLoan(loan.id_prestamo); setSection("estado"); }} type="button">Pagar</button>}
                  </article>
                ))}
              </div>
            )}

            {loans.some(loan => loan.estado === "ACTIVO") && (
              <form className="payment-box" onSubmit={pay}>
                <div><span className="eyebrow">PAGO DE CUOTA</span><h3>Registrar pago</h3></div>
                <div className="form-grid">
                  <div className="field"><label htmlFor="loanSelect">Préstamo</label><select id="loanSelect" value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}><option value="">Selecciona</option>{activeLoans.map(loan => <option key={loan.id_prestamo} value={loan.id_prestamo}>#{loan.id_prestamo.slice(-6).toUpperCase()} · {money(loan.saldo)}</option>)}</select></div>
                  <div className="field"><label htmlFor="payment">Monto a pagar</label><input id="payment" type="number" min="1" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Ej. 500" required /></div>
                  <div className="field"><label htmlFor="method">Método</label><select id="method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option>Transferencia</option><option>Tarjeta</option><option>Efectivo</option></select></div>
                </div>
                <button className="primary-button" type="submit">Registrar pago</button>
              </form>
            )}
          </section>
        )}

        {section === "historial" && (
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow">REGISTROS</span><h2>Historial de préstamos</h2></div></div>
            {loans.length === 0 && payments.length === 0 ? <div className="empty-state"><span>▤</span><h3>No hay historial todavía</h3><p>Aquí aparecerán tus préstamos y pagos.</p></div> : <div className="history-table">
              <div className="table-head"><span>Préstamo</span><span>Fecha</span><span>Monto</span><span>Estado</span></div>
              {loans.map(loan => <div className="table-row" key={loan.id_prestamo}><span>#{loan.id_prestamo.slice(-6).toUpperCase()}</span><span>{date(loan.fecha_prestamo)}</span><span>{money(loan.monto)}</span><span className="status">{loan.estado}</span></div>)}
              {payments.map(payment => <div className="table-row payment-row" key={payment.id_pago}><span>Pago #{payment.id_pago.slice(-6).toUpperCase()}</span><span>{date(payment.fecha_pago)}</span><span>{money(payment.monto_pago)}</span><span className="status paid">{payment.metodo_pago}</span></div>)}
            </div>}
          </section>
        )}

        {section === "perfil" && (
          <section className="profile-grid">
            <div className="panel profile-card"><div className="big-avatar">{user.name.charAt(0).toUpperCase()}</div><h2>{user.name}</h2><span className="status paid">CLIENTE</span><p className="muted">Información registrada en el sistema de demostración.</p></div>
            <div className="panel details"><div><span>Nombre</span><strong>{user.name}</strong></div><div><span>Carnet de identidad</span><strong>{user.carnet}</strong></div><div><span>Correo</span><strong>{client?.correo || "No registrado"}</strong></div><div><span>Teléfono</span><strong>{client?.telefono || "No registrado"}</strong></div><div><span>Dirección</span><strong>{client?.direccion || "No registrada"}</strong></div><div><span>Rol</span><strong>{user.role}</strong></div></div>
          </section>
        )}
      </main>

      <footer className="footer">Banco Verde · Proyecto de Sistemas Informáticos · Datos de demostración</footer>
    </div>
  );
}

export default HomePage;

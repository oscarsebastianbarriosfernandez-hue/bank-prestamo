import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authRepository } from "../repositories/authRepository";

type Section = "inicio" | "solicitar" | "estado" | "historial" | "historial-pagos" | "perfil";
type PaymentType = "CUOTA" | "TOTAL";

const money = (value: number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(value);

const date = (value: string) =>
  new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(value));

const statusLabel = (status: string) => status === "PAGADO" ? "Pagado" : status;

function HomePage() {
  const navigate = useNavigate();
  const user = authRepository.getCurrentUser();
  const [section, setSection] = useState<Section>("inicio");
  const [refresh, setRefresh] = useState(0);
  const [amount, setAmount] = useState(5000);
  const [months, setMonths] = useState(12);
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [paymentType, setPaymentType] = useState<PaymentType>("CUOTA");
  const [selectedLoan, setSelectedLoan] = useState("");
  const [historyLoan, setHistoryLoan] = useState("");
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
  const selectedLoanRecord = activeLoans.find((loan) => loan.id_prestamo === selectedLoan);
  const paymentAmount = selectedLoanRecord
    ? paymentType === "TOTAL"
      ? selectedLoanRecord.saldo
      : Math.min(selectedLoanRecord.cuota_mensual, selectedLoanRecord.saldo)
    : 0;
  const historyLoanRecord = loans.find((loan) => loan.id_prestamo === historyLoan);
  const historyPayments = payments
    .filter((payment) => payment.id_prestamo === historyLoan)
    .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  };

  const handleLogout = () => {
    authRepository.logout();
    navigate("/login", { replace: true });
  };

  const requestLoan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeLoans.length >= 2) {
      showMessage("Ya tienes dos préstamos activos. Termina uno para solicitar otro.");
      return;
    }
    const loan = authRepository.createLoan(user.id, amount, months);
    if (!loan) {
      showMessage("No se pudo solicitar el préstamo. Revisa el monto disponible.");
      return;
    }
    showMessage("¡Préstamo solicitado correctamente!");
    setRefresh((value) => value + 1);
    setSection("estado");
  };

  const pay = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLoanRecord || paymentAmount <= 0) {
      showMessage("Selecciona un préstamo activo.");
      return;
    }

    const result = authRepository.payLoan(
      user.id,
      selectedLoanRecord.id_prestamo,
      paymentAmount,
      paymentMethod,
      paymentType
    );
    if (!result) {
      showMessage("No se pudo registrar el pago. Verifica el préstamo seleccionado.");
      return;
    }

    showMessage(paymentType === "TOTAL" ? "¡Préstamo cancelado por completo!" : "Cuota registrada correctamente.");
    setRefresh((current) => current + 1);
    if (paymentType === "TOTAL" || paymentAmount >= selectedLoanRecord.saldo) {
      setSelectedLoan("");
      setPaymentType("CUOTA");
    }
  };

  const go = (target: Section) => {
    setSection(target);
    setMessage("");
  };

  const sectionTitle: Record<Section, string> = {
    inicio: "Resumen de tu cuenta",
    solicitar: "Solicitar préstamo",
    estado: "Estado de préstamos",
    historial: "Historial de préstamos",
    "historial-pagos": "Historial de pagos",
    perfil: "Mi perfil",
  };

  const simulationTotal = amount * (1 + 0.12 * (months / 12));
  const monthly = simulationTotal / months;

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
          <button className={section === "historial" || section === "historial-pagos" ? "nav-active" : ""} onClick={() => go("historial")} type="button">Historial</button>
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
            <h1>{sectionTitle[section]}</h1>
            <p>Hola, {user.name.split(" ")[0]}. Gestiona tus préstamos desde un solo lugar.</p>
          </div>
          <div className="balance-card">
            <span>Crédito disponible</span>
            <strong>{money(available)}</strong>
            <small>Límite de demostración: Bs 20.000</small>
          </div>
        </section>

        {message && <div className="toast" role="status">{message}</div>}

        {section === "inicio" && (
          <>
            <section className="stats-grid">
              <div className="stat-card"><span>Préstamos activos</span><strong>{activeLoans.length} / 2</strong><small>Máximo permitido</small></div>
              <div className="stat-card"><span>Deuda actual</span><strong>{money(totalDebt)}</strong><small>Saldo pendiente</small></div>
              <div className="stat-card"><span>Pagos realizados</span><strong>{payments.length}</strong><small>Registrados en el sistema</small></div>
            </section>

            <section className="action-grid">
              <button className="action-card green-card" onClick={() => go("solicitar")} type="button"><span>＋</span><strong>Solicitar préstamo</strong><small>Simula y registra una nueva solicitud</small></button>
              <button className="action-card" onClick={() => go("estado")} type="button"><span>⌕</span><strong>Consultar estado</strong><small>Revisa saldos y préstamos activos</small></button>
              <button className="action-card" onClick={() => go("estado")} type="button"><span>▣</span><strong>Pagar cuotas</strong><small>Paga la cuota exacta o cancela el saldo</small></button>
              <button className="action-card" onClick={() => go("historial")} type="button"><span>▤</span><strong>Historial</strong><small>Consulta préstamos y sus pagos</small></button>
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

              {activeLoans.length >= 2 && <div className="form-error">Ya alcanzaste el máximo de dos préstamos activos. Debes pagar uno antes de solicitar otro.</div>}

              <div className="field"><label htmlFor="amount">Monto solicitado: {money(amount)}</label><input id="amount" type="range" min="500" max={Math.max(500, available)} step="500" value={Math.min(amount, Math.max(500, available))} onChange={e => setAmount(Number(e.target.value))} /><div className="range-labels"><span>Bs 500</span><span>Bs {Math.round(available).toLocaleString("es-BO")}</span></div></div>

              <div className="field"><label htmlFor="months">Plazo</label><select id="months" value={months} onChange={e => setMonths(Number(e.target.value))}><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={18}>18 meses</option><option value={24}>24 meses</option></select></div>

              <div className="loan-summary"><div><span>Monto</span><strong>{money(amount)}</strong></div><div><span>Interés demo</span><strong>12% anual</strong></div><div><span>Cuota estimada</span><strong>{money(monthly)}</strong></div><div><span>Total estimado</span><strong>{money(simulationTotal)}</strong></div></div>

              <button className="primary-button full" type="submit" disabled={activeLoans.length >= 2 || amount > available || available <= 0}>Solicitar préstamo</button>
              <small className="legal-note">Valores únicamente demostrativos para el proyecto académico.</small>
            </form>

            <aside className="side-panel">
              <div className="side-illustration">💳</div>
              <h3>¿Cómo funciona?</h3>
              <ol><li>Selecciona monto y plazo.</li><li>Revisa la cuota estimada.</li><li>Registra la solicitud.</li><li>Consulta y paga desde tu panel.</li></ol>
              <p className="muted">Puedes mantener hasta dos préstamos activos al mismo tiempo.</p>
            </aside>
          </section>
        )}

        {section === "estado" && (
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow">SEGUIMIENTO</span><h2>Mis préstamos</h2></div><span className="count-pill">{activeLoans.length} de 2 activos</span></div>
            {loans.length === 0 ? <div className="empty-state"><span>◌</span><h3>Aún no tienes préstamos</h3><p>Solicita tu primer préstamo de prueba para verlo aquí.</p><button className="primary-button" onClick={() => go("solicitar")} type="button">Solicitar préstamo</button></div> : (
              <div className="loan-list">
                {loans.map((loan) => (
                  <article className="loan-row" key={loan.id_prestamo}>
                    <div className="loan-main"><span className="loan-number">#{loan.id_prestamo.slice(-6).toUpperCase()}</span><h3>{money(loan.monto)}</h3><p>{loan.plazo_meses} meses · {loan.interes}% anual · {date(loan.fecha_prestamo)}</p></div>
                    <div className="loan-balance"><span>Saldo pendiente</span><strong>{money(loan.saldo)}</strong><em className={loan.estado === "PAGADO" ? "status paid" : "status"}>{statusLabel(loan.estado)}</em></div>
                    {loan.estado === "ACTIVO" && <button className="outline-button" onClick={() => { setSelectedLoan(loan.id_prestamo); setPaymentType("CUOTA"); }} type="button">Seleccionar para pagar</button>}
                  </article>
                ))}
              </div>
            )}

            {activeLoans.length > 0 && (
              <form className="payment-box" onSubmit={pay}>
                <div><span className="eyebrow">PAGO CONTROLADO</span><h3>Realizar un pago</h3><p className="muted">El sistema calcula el importe permitido; no necesitas escribirlo manualmente.</p></div>
                <div className="form-grid">
                  <div className="field"><label htmlFor="loanSelect">Préstamo activo</label><select id="loanSelect" value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)} required><option value="">Selecciona un préstamo</option>{activeLoans.map(loan => <option key={loan.id_prestamo} value={loan.id_prestamo}>#{loan.id_prestamo.slice(-6).toUpperCase()} · Saldo {money(loan.saldo)}</option>)}</select></div>
                  <div className="field"><label htmlFor="paymentType">Tipo de pago</label><select id="paymentType" value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)}><option value="CUOTA">Pagar cuota exacta</option><option value="TOTAL">Pagar todo lo que debo</option></select></div>
                  <div className="field"><label htmlFor="method">Método de pago</label><select id="method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option>Transferencia</option><option>Tarjeta</option><option>Efectivo</option></select></div>
                </div>
                {selectedLoanRecord && <div className="payment-amount-preview"><span>{paymentType === "TOTAL" ? "Importe para cancelar el préstamo" : "Importe exacto de la cuota"}</span><strong>{money(paymentAmount)}</strong>{paymentType === "CUOTA" && paymentAmount < selectedLoanRecord.cuota_mensual && <small>Este es el saldo restante, menor que una cuota completa.</small>}</div>}
                <button className="primary-button" type="submit" disabled={!selectedLoanRecord}>Confirmar pago</button>
              </form>
            )}
          </section>
        )}

        {section === "historial" && (
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow">REGISTROS</span><h2>Historial de préstamos</h2><p className="muted">Aquí se muestran únicamente los préstamos. Abre uno para consultar sus pagos.</p></div><span className="count-pill">{loans.length} préstamos</span></div>
            {loans.length === 0 ? <div className="empty-state"><span>▤</span><h3>No hay préstamos registrados</h3><p>Cuando solicites un préstamo aparecerá aquí.</p></div> : <div className="history-table loan-history-table">
              <div className="table-head"><span>Préstamo</span><span>Fecha</span><span>Monto inicial</span><span>Saldo</span><span>Estado</span><span>Detalle</span></div>
              {loans.slice().sort((a, b) => new Date(b.fecha_prestamo).getTime() - new Date(a.fecha_prestamo).getTime()).map(loan => (
                <div className="table-row" key={loan.id_prestamo}>
                  <span>#{loan.id_prestamo.slice(-6).toUpperCase()}</span><span>{date(loan.fecha_prestamo)}</span><span>{money(loan.monto)}</span><span>{money(loan.saldo)}</span><span><em className={loan.estado === "PAGADO" ? "status paid" : "status"}>{statusLabel(loan.estado)}</em></span>
                  <span><button className="outline-button compact-button" type="button" onClick={() => { setHistoryLoan(loan.id_prestamo); go("historial-pagos"); }}>Ver pagos</button></span>
                </div>
              ))}
            </div>}
          </section>
        )}

        {section === "historial-pagos" && (
          <section className="panel">
            <button className="back-link" type="button" onClick={() => go("historial")}>← Volver al historial de préstamos</button>
            {historyLoanRecord ? <>
              <div className="panel-heading"><div><span className="eyebrow">DETALLE DEL PRÉSTAMO</span><h2>Pagos del préstamo #{historyLoanRecord.id_prestamo.slice(-6).toUpperCase()}</h2></div><em className={historyLoanRecord.estado === "PAGADO" ? "status paid" : "status"}>{statusLabel(historyLoanRecord.estado)}</em></div>
              <div className="loan-summary history-summary"><div><span>Monto inicial</span><strong>{money(historyLoanRecord.monto)}</strong></div><div><span>Saldo pendiente</span><strong>{money(historyLoanRecord.saldo)}</strong></div><div><span>Cuota mensual</span><strong>{money(historyLoanRecord.cuota_mensual)}</strong></div><div><span>Fecha del préstamo</span><strong>{date(historyLoanRecord.fecha_prestamo)}</strong></div></div>
              <h3 className="history-subtitle">Pagos registrados</h3>
              {historyPayments.length === 0 ? <div className="empty-state"><h3>Este préstamo aún no tiene pagos</h3><p>Cuando realices un pago, aparecerá detallado aquí.</p></div> : <div className="history-table">
                <div className="table-head payment-history-head"><span>Pago</span><span>Fecha</span><span>Importe pagado</span><span>Método</span></div>
                {historyPayments.map(payment => <div className="table-row payment-history-row" key={payment.id_pago}><span>#{payment.id_pago.slice(-6).toUpperCase()}</span><span>{date(payment.fecha_pago)}</span><span>{money(payment.monto_pago)}</span><span>{payment.metodo_pago}</span></div>)}
              </div>}
            </> : <div className="empty-state"><h3>No se encontró el préstamo</h3><button className="outline-button" onClick={() => go("historial")} type="button">Volver</button></div>}
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

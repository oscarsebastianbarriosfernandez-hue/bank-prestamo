export type UserRole = "ADMIN" | "USUARIO";

export interface User {
  id: string;
  name: string;
  carnet: string;
  role: UserRole;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UserRecord extends User {
  password: string;
}

export interface LoginCredentials {
  carnet: string;
  password: string;
}

export interface Client {
  id_cliente: string;
  nombre: string;
  apellido: string;
  ci: string;
  telefono: string;
  direccion: string;
  correo: string;
  userId: string;
}

export type LoanStatus = "PENDIENTE" | "ACTIVO" | "PAGADO" | "RECHAZADO";

export interface Loan {
  id_prestamo: string;
  id_cliente: string;
  monto: number;
  fecha_prestamo: string;
  plazo_meses: number;
  interes: number;
  saldo: number;
  estado: LoanStatus;
  cuota_mensual: number;
}

export interface Payment {
  id_pago: string;
  id_prestamo: string;
  monto_pago: number;
  fecha_pago: string;
  metodo_pago: string;
}

export interface BankDatabase {
  usuarios: UserRecord[];
  clientes: Client[];
  prestamos: Loan[];
  pagos: Payment[];
}

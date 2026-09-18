import initialUsers from "../data/users.json";
import { storageService } from "../services/storageService";
import type {
  BankDatabase,
  Client,
  Loan,
  LoginCredentials,
  Payment,
  User,
  UserRecord,
} from "../types/auth";

const DATABASE_KEY = "bank_database";
const SESSION_KEY = "app_session";

const seedUsers = initialUsers as UserRecord[];

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createInitialDatabase = (): BankDatabase => {
  const usuarios = seedUsers;
  const clientes: Client[] = usuarios
    .filter((user) => user.role === "USUARIO")
    .map((user) => ({
      id_cliente: `cliente-${user.id}`,
      nombre: user.name.split(" ")[0] || user.name,
      apellido: user.name.split(" ").slice(1).join(" ") || "Prueba",
      ci: user.carnet,
      telefono: "70000000",
      direccion: "Sucre, Bolivia",
      correo: user.email || "usuario@demo.com",
      userId: user.id,
    }));

  return { usuarios, clientes, prestamos: [], pagos: [] };
};

const getDatabase = (): BankDatabase => {
  const stored = storageService.get<BankDatabase>(DATABASE_KEY);
  if (stored) return stored;

  const database = createInitialDatabase();
  storageService.set(DATABASE_KEY, database);
  return database;
};

const saveDatabase = (database: BankDatabase) => {
  storageService.set(DATABASE_KEY, database);
};

const toSessionUser = (user: UserRecord): User => ({
  id: user.id,
  name: user.name,
  carnet: user.carnet,
  role: user.role,
  email: user.email,
  phone: user.phone,
  address: user.address,
});

export const authRepository = {
  login(credentials: LoginCredentials): User | null {
    const database = getDatabase();
    const foundUser = database.usuarios.find(
      (user) =>
        user.carnet === credentials.carnet.trim() &&
        user.password === credentials.password
    );

    if (!foundUser) return null;

    const sessionUser = toSessionUser(foundUser);
    storageService.set<User>(SESSION_KEY, sessionUser);
    return sessionUser;
  },

  register(data: {
    name: string;
    carnet: string;
    password: string;
    email: string;
    phone: string;
    address: string;
  }): { user: User | null; error?: string } {
    const database = getDatabase();
    const carnet = data.carnet.trim();

    if (database.usuarios.some((user) => user.carnet === carnet)) {
      return { user: null, error: "Ya existe un usuario con ese carnet." };
    }

    const id = makeId("user");
    const newUser: UserRecord = {
      id,
      name: data.name.trim(),
      carnet,
      password: data.password,
      role: "USUARIO",
      email: data.email.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
    };

    const client: Client = {
      id_cliente: makeId("cliente"),
      nombre: data.name.trim().split(" ")[0] || data.name.trim(),
      apellido: data.name.trim().split(" ").slice(1).join(" ") || "Usuario",
      ci: carnet,
      telefono: data.phone.trim(),
      direccion: data.address.trim(),
      correo: data.email.trim(),
      userId: id,
    };

    database.usuarios.push(newUser);
    database.clientes.push(client);
    saveDatabase(database);

    const sessionUser = toSessionUser(newUser);
    storageService.set<User>(SESSION_KEY, sessionUser);
    return { user: sessionUser };
  },

  logout(): void {
    storageService.remove(SESSION_KEY);
  },

  getCurrentUser(): User | null {
    return storageService.get<User>(SESSION_KEY);
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  getDatabase,

  getClient(userId: string): Client | null {
    return getDatabase().clientes.find((client) => client.userId === userId) || null;
  },

  getLoans(userId: string): Loan[] {
    const database = getDatabase();
    const client = database.clientes.find((item) => item.userId === userId);
    if (!client) return [];
    return database.prestamos.filter((loan) => loan.id_cliente === client.id_cliente);
  },

  getPayments(userId: string): Payment[] {
    const database = getDatabase();
    const loans = this.getLoans(userId);
    const loanIds = new Set(loans.map((loan) => loan.id_prestamo));
    return database.pagos.filter((payment) => loanIds.has(payment.id_prestamo));
  },

  createLoan(userId: string, amount: number, months: number): Loan | null {
    const database = getDatabase();
    const client = database.clientes.find((item) => item.userId === userId);
    if (!client || amount <= 0 || months <= 0) return null;

    const currentLoans = database.prestamos.filter(
      (loan) => loan.id_cliente === client.id_cliente && loan.estado === "ACTIVO"
    );
    const activeBalance = currentLoans.reduce((sum, loan) => sum + loan.saldo, 0);
    const available = Math.max(0, 20000 - activeBalance);
    if (amount > available) return null;

    const annualInterest = 0.12;
    const total = amount * (1 + annualInterest * (months / 12));
    const monthly = total / months;

    const loan: Loan = {
      id_prestamo: makeId("prestamo"),
      id_cliente: client.id_cliente,
      monto: amount,
      fecha_prestamo: new Date().toISOString(),
      plazo_meses: months,
      interes: annualInterest * 100,
      saldo: Number(total.toFixed(2)),
      estado: "ACTIVO",
      cuota_mensual: Number(monthly.toFixed(2)),
    };

    database.prestamos.push(loan);
    saveDatabase(database);
    return loan;
  },

  payLoan(userId: string, loanId: string, amount: number, method: string): Payment | null {
    const database = getDatabase();
    const loan = database.prestamos.find((item) => item.id_prestamo === loanId);
    if (!loan || amount <= 0 || amount > loan.saldo) return null;

    const userLoans = this.getLoans(userId);
    if (!userLoans.some((item) => item.id_prestamo === loanId)) return null;

    const payment: Payment = {
      id_pago: makeId("pago"),
      id_prestamo: loanId,
      monto_pago: Number(amount.toFixed(2)),
      fecha_pago: new Date().toISOString(),
      metodo_pago: method,
    };

    loan.saldo = Number((loan.saldo - amount).toFixed(2));
    if (loan.saldo <= 0) {
      loan.saldo = 0;
      loan.estado = "PAGADO";
    }

    database.pagos.push(payment);
    saveDatabase(database);
    return payment;
  },

  getAvailableCredit(userId: string): number {
    const activeBalance = this.getLoans(userId)
      .filter((loan) => loan.estado === "ACTIVO")
      .reduce((sum, loan) => sum + loan.saldo, 0);
    return Math.max(0, 20000 - activeBalance);
  },
};

-- CreateTable
CREATE TABLE employees (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    national_id TEXT,
    phone TEXT,
    email TEXT,
    position TEXT NOT NULL,
    department TEXT NOT NULL,
    station_id TEXT,
    joining_date DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    employment_type TEXT NOT NULL DEFAULT 'دوام كامل',
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    allowances DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'نشط',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT employees_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE employee_transactions (
    id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    treasury_account_id TEXT,
    financial_transaction_id TEXT,
    ref_doc TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'معتمد',
    created_by UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT employee_transactions_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE INDEX employees_station_id_idx ON employees(station_id);

-- CreateIndex
CREATE INDEX employees_department_idx ON employees(department);

-- CreateIndex
CREATE INDEX employees_status_idx ON employees(status);

-- CreateIndex
CREATE UNIQUE INDEX employee_transactions_financial_transaction_id_key ON employee_transactions(financial_transaction_id);

-- CreateIndex
CREATE INDEX employee_transactions_employee_id_idx ON employee_transactions(employee_id);

-- CreateIndex
CREATE INDEX employee_transactions_date_idx ON employee_transactions(date);

-- CreateIndex
CREATE INDEX employee_transactions_type_idx ON employee_transactions(type);

-- CreateIndex
CREATE INDEX employee_transactions_treasury_account_id_idx ON employee_transactions(treasury_account_id);

-- AddForeignKey
ALTER TABLE employees ADD CONSTRAINT employees_station_id_fkey FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE employee_transactions ADD CONSTRAINT employee_transactions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE employee_transactions ADD CONSTRAINT employee_transactions_treasury_account_id_fkey FOREIGN KEY (treasury_account_id) REFERENCES treasury_accounts(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE employee_transactions ADD CONSTRAINT employee_transactions_financial_transaction_id_fkey FOREIGN KEY (financial_transaction_id) REFERENCES financial_transactions(txn_id) ON DELETE SET NULL ON UPDATE CASCADE;

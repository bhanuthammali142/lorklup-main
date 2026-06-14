-- =============================================
-- HOSTELOS DATABASE SCHEMA (PostgreSQL)
-- =============================================

-- Clean up existing tables if running repeatedly
DROP TABLE IF EXISTS platform_invoices CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS billing_plans CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reward_points CASCADE;
DROP TABLE IF EXISTS reward_leaderboard CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS platform_tickets CASCADE;
DROP TABLE IF EXISTS platform_notifications CASCADE;
DROP TABLE IF EXISTS food_menus CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS hostels CASCADE;
DROP TABLE IF EXISTS hostel_owners CASCADE;
DROP TABLE IF EXISTS super_admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'student')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. SUPER_ADMINS
-- =============================================
CREATE TABLE super_admins (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. HOSTEL_OWNERS
-- =============================================
CREATE TABLE hostel_owners (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_name VARCHAR(100) NOT NULL,
    owner_phone VARCHAR(20),
    owner_email VARCHAR(255),
    bank_name VARCHAR(100),
    account_holder VARCHAR(150),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. HOSTELS
-- =============================================
CREATE TABLE hostels (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES hostel_owners(id) ON DELETE CASCADE,
    hostel_name VARCHAR(200) NOT NULL,
    hostel_code VARCHAR(50) UNIQUE NOT NULL,
    address_line1 TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Unknown',
    state VARCHAR(100) DEFAULT 'Unknown',
    pincode VARCHAR(10) DEFAULT '000000',
    phone VARCHAR(20),
    email VARCHAR(255),
    total_floors INT DEFAULT 0,
    total_rooms INT DEFAULT 0,
    total_beds INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. ROOMS  (UUID pk — roomController uses crypto.randomUUID())
-- =============================================
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor VARCHAR(50) DEFAULT 'Ground Floor',
    type VARCHAR(50) DEFAULT 'Non-AC',
    capacity INT DEFAULT 3,
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hostel_id, room_number)
);

-- =============================================
-- 6. BEDS  (UUID pk)
-- =============================================
CREATE TABLE beds (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hostel_id, room_id, bed_number)
);

-- =============================================
-- 7. STUDENTS (UUID pk)
-- =============================================
CREATE TABLE students (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
    room_id VARCHAR(36) NULL REFERENCES rooms(id) ON DELETE SET NULL,
    bed_id VARCHAR(36) NULL REFERENCES beds(id) ON DELETE SET NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    parent_phone VARCHAR(20),
    id_number VARCHAR(50),
    college_name VARCHAR(200),
    branch VARCHAR(100),
    joining_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    advance_amount DECIMAL(10,2) DEFAULT 0,
    monthly_payment_day INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. FEES (UUID pk)
-- =============================================
CREATE TABLE fees (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    due_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    month DATE NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    paid_at TIMESTAMP NULL,
    receipt_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, month)
);

-- =============================================
-- 9. PAYMENTS (UUID pk)
-- =============================================
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL,
    fee_id VARCHAR(36) NOT NULL REFERENCES fees(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 10. COMPLAINTS (UUID pk)
-- =============================================
CREATE TABLE complaints (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NULL REFERENCES students(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 11. ANNOUNCEMENTS (UUID pk)
-- =============================================
CREATE TABLE announcements (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 12. ATTENDANCE (UUID pk)
-- =============================================
CREATE TABLE attendance (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, date)
);

-- =============================================
-- 13. FOOD_MENUS (UUID pk)
-- =============================================
CREATE TABLE food_menus (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL UNIQUE REFERENCES hostels(id) ON DELETE CASCADE,
    menu JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTIFICATIONS (In-app notifications)
-- =============================================
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT REFERENCES hostels(id) ON DELETE CASCADE,
    student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_student_id ON notifications(student_id);

-- =============================================
-- REWARD POINTS
-- =============================================
CREATE TABLE reward_points (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    points INT NOT NULL DEFAULT 0,
    reason VARCHAR(200),
    type VARCHAR(50) CHECK (type IN ('earned','redeemed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- REWARD LEADERBOARD
-- =============================================
CREATE TABLE reward_leaderboard (
    hostel_id INT NOT NULL REFERENCES hostels(id),
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    total_points INT DEFAULT 0,
    rank INT,
    period VARCHAR(20),
    PRIMARY KEY (hostel_id, student_id, period)
);

-- =============================================
-- SEED: Super Admin
-- =============================================
INSERT INTO users (email, password, role, is_active)
VALUES ('admin@hostel.com', 'Bhanu@2006', 'super_admin', TRUE);

INSERT INTO super_admins (user_id, name, phone)
VALUES (1, 'Bhanu Super Admin', '9999999999');

-- =============================================
-- 14. PLATFORM TICKETS (Super Admin Support)
-- =============================================
CREATE TABLE platform_tickets (
  id VARCHAR(36) PRIMARY KEY,
  hostel_id INT REFERENCES hostels(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in-progress','resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 15. AUDIT LOGS
-- =============================================
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 16. PLATFORM NOTIFICATIONS
-- =============================================
CREATE TABLE platform_notifications (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target_role VARCHAR(20) DEFAULT 'all' CHECK (target_role IN ('all', 'super_admin', 'admin', 'student')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 17. BILLING_PLANS
-- =============================================
CREATE TABLE billing_plans (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    max_students INT DEFAULT 200,
    razorpay_plan_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 18. SUBSCRIPTIONS
-- =============================================
CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(20) DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    razorpay_subscription_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 19. PLATFORM_INVOICES
-- =============================================
CREATE TABLE platform_invoices (
    id VARCHAR(36) PRIMARY KEY,
    hostel_id INT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed')),
    paid_at TIMESTAMP,
    razorpay_payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    username      VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL
);

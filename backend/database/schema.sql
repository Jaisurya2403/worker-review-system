-- ============================================================
-- QR-Based Worker Review System - Database Schema
-- Run this file in MySQL to set up the database
-- ============================================================

-- Create and use the database
CREATE DATABASE IF NOT EXISTS worker_review_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE worker_review_db;

-- ============================================================
-- Table: admins
-- Application-level admins who manage all stores
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: stores
-- Each store has a unique QR slug used in the customer URL
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_name VARCHAR(200) NOT NULL,
  store_address TEXT,
  qr_slug VARCHAR(100) NOT NULL UNIQUE,
  subscription_status ENUM('active', 'disabled') DEFAULT 'active',
  qr_code_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: store_users
-- Login accounts for store owners (linked to a store)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: workers
-- Workers belong to a store; customers review them
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  worker_name VARCHAR(200) NOT NULL,
  role VARCHAR(200),
  image_path VARCHAR(255),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: reviews
-- Anonymous customer reviews for workers
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  worker_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_type ENUM('good', 'bad') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
